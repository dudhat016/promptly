import admin from "firebase-admin";
import { sendEmail } from "../lib/mailer.js";
import { getAppUrl } from "../lib/config.js";

interface AutomationStep {
  id: string;
  type: 'wait' | 'send_email' | 'add_tag' | 'remove_tag' | 'notify_user' | 'condition' | 'webhook' | 'ab_test' | 'recommend_prompt';
  params: Record<string, any>;
}

interface AutomationFlow {
  id: string;
  name: string;
  trigger: { type: string; value?: string };
  steps: AutomationStep[];
  active: boolean;
}

interface FlowInstance {
  flowId:           string;
  flowName:         string;
  userId:           string;
  userEmail:        string;
  userName:         string;
  currentStepIndex: number;
  status:           'pending' | 'completed' | 'failed';
  scheduledAt:      admin.firestore.Timestamp;
  triggerData:      Record<string, any>;
  completedSteps:   number[];
  createdAt:        admin.firestore.Timestamp;
  updatedAt:        admin.firestore.Timestamp;
  expireAt?:        admin.firestore.Timestamp;
  error?:           string;
}

function waitDurationMs(duration: number, unit: string): number {
  const ms = { minutes: 60_000, hours: 3_600_000, days: 86_400_000 };
  return duration * (ms[unit as keyof typeof ms] ?? ms.days);
}

// ─── TRIGGER ─────────────────────────────────────────────────────────────────

export async function triggerFlow(
  db: admin.firestore.Firestore,
  triggerType: string,
  userId: string,
  triggerData: Record<string, any> = {}
) {
  try {
    // Find all active flows with this trigger type
    const flowsSnap = await db.collection("marketing_automations")
      .where("active", "==", true)
      .where("trigger.type", "==", triggerType)
      .get();

    if (flowsSnap.empty) return;

    // Fetch the user
    const userSnap = await db.collection("users").doc(userId).get();
    if (!userSnap.exists) return;
    const user = userSnap.data()!;

    for (const flowDoc of flowsSnap.docs) {
      const flow = { id: flowDoc.id, ...flowDoc.data() } as AutomationFlow;
      if (!flow.steps?.length) continue;

      // Check trigger value condition (e.g. tag_added with specific tagId)
      if (flow.trigger.value && triggerData.value && flow.trigger.value !== triggerData.value) {
        continue;
      }

      // Prevent duplicate instances for same user + flow within 24h
      const existingSnap = await db.collection("flow_instances")
        .where("flowId",  "==", flow.id)
        .where("userId",  "==", userId)
        .where("status",  "==", "pending")
        .limit(1).get();
      if (!existingSnap.empty) continue;

      const now = admin.firestore.Timestamp.now();

      // Find the first real step (skip leading wait for immediate first step)
      const firstStep = flow.steps[0];
      let scheduledAt = now;
      let startIndex  = 0;

      if (firstStep?.type === 'wait') {
        const delay = waitDurationMs(
          Number(firstStep.params?.duration ?? 1),
          firstStep.params?.unit ?? 'days'
        );
        scheduledAt = admin.firestore.Timestamp.fromMillis(now.toMillis() + delay);
        startIndex  = 1; // skip the wait, execute step after it next tick
      }

      // TTL: auto-expire completed/failed instances after 60 days
      const expireAt = admin.firestore.Timestamp.fromMillis(now.toMillis() + 60 * 86_400_000);

      const instance: FlowInstance = {
        flowId:           flow.id,
        flowName:         flow.name,
        userId,
        userEmail:        user.email   || triggerData.email || '',
        userName:         user.displayName || 'Creator',
        currentStepIndex: startIndex,
        status:           'pending',
        scheduledAt,
        triggerData,
        completedSteps:   firstStep?.type === 'wait' ? [0] : [],
        createdAt:        now,
        updatedAt:        now,
        expireAt,
      };

      await db.collection("flow_instances").add(instance);
    }
  } catch (err) {
    console.error(`[AutomationEngine] triggerFlow error (${triggerType}):`, err);
  }
}

// ─── TICK ─────────────────────────────────────────────────────────────────────
// Called by a cron job — processes all due flow instances

export async function tick(db: admin.firestore.Firestore): Promise<{ processed: number; errors: number }> {
  const now = admin.firestore.Timestamp.now();
  let processed = 0, errors = 0;

  const dueSnap = await db.collection("flow_instances")
    .where("status",      "==", "pending")
    .where("scheduledAt", "<=", now)
    .limit(50)
    .get();

  for (const instanceDoc of dueSnap.docs) {
    const instance = instanceDoc.data() as FlowInstance;
    const instanceRef = instanceDoc.ref;

    try {
      // Reload the flow definition
      const flowDoc = await db.collection("marketing_automations").doc(instance.flowId).get();
      if (!flowDoc.exists || !flowDoc.data()?.active) {
        await instanceRef.update({ status: 'completed', updatedAt: now });
        continue;
      }

      const flow    = flowDoc.data()! as AutomationFlow;
      const step    = flow.steps[instance.currentStepIndex];

      if (!step) {
        await instanceRef.update({ status: 'completed', updatedAt: now });
        processed++;
        continue;
      }

      // Reload user for condition checks
      const userSnap = await db.collection("users").doc(instance.userId).get();
      const user     = userSnap.exists ? userSnap.data()! : {};

      const vars: Record<string, string> = {
        name:  instance.userName,
        email: instance.userEmail,
        ...Object.fromEntries(
          Object.entries({ ...instance.triggerData, ...user })
            .filter(([, v]) => typeof v === 'string' || typeof v === 'number')
            .map(([k, v]) => [k, String(v)])
        ),
      };

      let nextStepIndex = instance.currentStepIndex + 1;
      let nextScheduledAt: admin.firestore.Timestamp = now;
      let stopFlow = false;

      switch (step.type) {
        case 'send_email': {
          const templateId = step.params?.templateId;
          if (templateId && instance.userEmail) {
            await sendEmail(db, instance.userEmail, templateId, vars);
          }
          break;
        }

        case 'wait': {
          const delay = waitDurationMs(
            Number(step.params?.duration ?? 1),
            step.params?.unit ?? 'days'
          );
          nextScheduledAt = admin.firestore.Timestamp.fromMillis(now.toMillis() + delay);
          break;
        }

        case 'add_tag': {
          const tagId = step.params?.tagId;
          if (tagId && instance.userEmail) {
            const contactSnap = await db.collection("marketing_contacts")
              .where("email", "==", instance.userEmail)
              .limit(1).get();
            if (!contactSnap.empty) {
              const existing: string[] = contactSnap.docs[0].data().tags || [];
              if (!existing.includes(tagId)) {
                await contactSnap.docs[0].ref.update({
                  tags: [...existing, tagId],
                  updatedAt: now,
                });
              }
            }
          }
          break;
        }

        case 'remove_tag': {
          const tagId = step.params?.tagId;
          if (tagId && instance.userEmail) {
            const contactSnap = await db.collection("marketing_contacts")
              .where("email", "==", instance.userEmail)
              .limit(1).get();
            if (!contactSnap.empty) {
              const existing: string[] = contactSnap.docs[0].data().tags || [];
              await contactSnap.docs[0].ref.update({
                tags: existing.filter(t => t !== tagId),
                updatedAt: now,
              });
            }
          }
          break;
        }

        case 'condition': {
          const { field, operator, value: condValue } = step.params || {};
          const userVal = String(user[field] ?? '');
          let matches = false;
          if (operator === 'equals')            matches = userVal === condValue;
          else if (operator === 'not_equals')   matches = userVal !== condValue;
          else if (operator === 'contains')     matches = userVal.includes(condValue);
          else if (operator === 'greater_than') matches = Number(userVal) > Number(condValue);
          else if (operator === 'less_than')    matches = Number(userVal) < Number(condValue);

          // If condition is false, skip to end of flow
          if (!matches) stopFlow = true;
          break;
        }

        case 'webhook': {
          const { url, method = 'POST' } = step.params || {};
          if (url) {
            try {
              await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: instance.userId, flowId: instance.flowId, vars }),
              });
            } catch (webhookErr) {
              console.warn(`[AutomationEngine] Webhook failed for ${url}:`, webhookErr);
            }
          }
          break;
        }

        case 'ab_test': {
          // Randomly assign variant A or B based on weight (default 50/50)
          const weight = Number(step.params?.weight ?? 50);
          const roll = Math.floor(Math.random() * 100);
          if (roll >= weight) {
            // User falls into variant B — stop this flow path
            stopFlow = true;
          }
          // Variant A continues normally to next step
          break;
        }

        case 'recommend_prompt': {
          const category = step.params?.category || 'all';
          if (instance.userEmail) {
            try {
              let promptQuery = db.collection("prompts")
                .where("status", "==", "approved")
                .orderBy("likesCount", "desc")
                .limit(1);

              if (category !== 'all') {
                promptQuery = db.collection("prompts")
                  .where("status", "==", "approved")
                  .where("category", "==", category)
                  .orderBy("likesCount", "desc")
                  .limit(1);
              }

              const promptSnap = await promptQuery.get();
              if (!promptSnap.empty) {
                const prompt = promptSnap.docs[0].data();
                const appUrl = getAppUrl();
                await sendEmail(db, instance.userEmail, 'new_prompt', {
                  ...vars,
                  prompt_title:       prompt.title       || 'Featured Prompt',
                  prompt_description: prompt.description || '',
                  prompt_url:         `${appUrl}/en/prompts/${promptSnap.docs[0].id}`,
                  category:           prompt.category    || category,
                });
              }
            } catch (promptErr) {
              console.warn('[AutomationEngine] recommend_prompt fetch failed:', promptErr);
            }
          }
          break;
        }

        default:
          break;
      }

      const completedSteps = [...(instance.completedSteps || []), instance.currentStepIndex];

      if (stopFlow || nextStepIndex >= flow.steps.length) {
        await instanceRef.update({
          status:          'completed',
          completedSteps,
          updatedAt:       now,
        });
      } else {
        await instanceRef.update({
          currentStepIndex: nextStepIndex,
          scheduledAt:      nextScheduledAt,
          completedSteps,
          updatedAt:        now,
        });
      }

      processed++;
    } catch (err: any) {
      console.error(`[AutomationEngine] tick error for instance ${instanceDoc.id}:`, err.message);
      await instanceRef.update({
        status:    'failed',
        error:     err.message,
        updatedAt: now,
      });
      errors++;
    }
  }

  return { processed, errors };
}

// ─── SEGMENT REBUILD ──────────────────────────────────────────────────────────
// Re-evaluates every segment's filters against live contact data and updates
// contactEmails so broadcast targeting stays accurate.

function evalFilter(contact: Record<string, any>, filter: { field: string; operator: string; value: any }): boolean {
  const raw = contact[filter.field];
  const val = filter.value;

  switch (filter.operator) {
    case 'equals':      return String(raw ?? '') === String(val);
    case 'not_equals':  return String(raw ?? '') !== String(val);
    case 'contains':
      if (Array.isArray(raw)) return raw.map(String).includes(String(val));
      return String(raw ?? '').toLowerCase().includes(String(val).toLowerCase());
    case 'in':
      if (Array.isArray(raw)) return (Array.isArray(val) ? val : [val]).some((v: any) => raw.map(String).includes(String(v)));
      return (Array.isArray(val) ? val : String(val).split(',')).map((v: any) => String(v).trim()).includes(String(raw ?? ''));
    case 'not_in':
      if (Array.isArray(raw)) return !(Array.isArray(val) ? val : [val]).some((v: any) => raw.map(String).includes(String(v)));
      return !(Array.isArray(val) ? val : String(val).split(',')).map((v: any) => String(v).trim()).includes(String(raw ?? ''));
    case 'greater_than': return Number(raw) > Number(val);
    case 'less_than':    return Number(raw) < Number(val);
    default:             return false;
  }
}

export async function rebuildSegments(db: admin.firestore.Firestore): Promise<{ rebuilt: number; errors: number }> {
  let rebuilt = 0, errors = 0;

  const [contactsSnap, segmentsSnap] = await Promise.all([
    db.collection("marketing_contacts").where("status", "==", "active").get(),
    db.collection("marketing_segments").get(),
  ]);

  const contacts = contactsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  for (const segDoc of segmentsSnap.docs) {
    const seg = segDoc.data();
    if (!seg.filters?.length) continue;

    try {
      const matchType: 'and' | 'or' = seg.matchType || 'and';
      const matched = contacts.filter(c => {
        const results = seg.filters.map((f: any) => evalFilter(c as Record<string, any>, f));
        return matchType === 'and' ? results.every(Boolean) : results.some(Boolean);
      });

      await segDoc.ref.update({
        contactEmails: matched.map((c: any) => c.email).filter(Boolean),
        contactCount:  matched.length,
        rebuiltAt:     new Date().toISOString(),
      });
      rebuilt++;
    } catch (err: any) {
      console.error(`[SegmentRebuild] failed for ${segDoc.id}:`, err.message);
      errors++;
    }
  }

  return { rebuilt, errors };
}
