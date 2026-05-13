import { GoogleGenAI, Modality } from "@google/genai";

const model = 'gemini-2.5-flash-image';

interface GenerateResult {
    image: string | null;
    mimeType: string | null;
}

const fileToGenerativePart = (file: File) => {
  return new Promise<{ inlineData: { data: string; mimeType: string; }} | null>((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target && typeof e.target.result === 'string') {
        // result is "data:mime/type;base64,..."
        const [header, data] = e.target.result.split(',');
        const mimeType = header.split(':')[1].split(';')[0];
        resolve({ inlineData: { data, mimeType } });
      } else {
        resolve(null);
      }
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
};


const getSystemInstruction = (style: string, background: string, hasReferencePhoto: boolean): string => {
  
  let backgroundInstruction = '';
    switch (background) {
        case 'Outdoor':
            backgroundInstruction = `**BACKGROUND:** A beautiful, luxurious outdoor setting. The background should be softly blurred (bokeh) to keep the focus on the subject. Examples: a high-end resort pool, a chic urban street with luxury cars, a balcony overlooking a city skyline at night.`;
            break;
        case 'Abstract':
            backgroundInstruction = `**BACKGROUND:** An artistic, abstract, or conceptual background. This could be a dynamic splash of color, a geometric pattern, or a textured, painterly backdrop. The background should complement the subject's outfit without overpowering it.`;
            break;
        case 'Studio':
        default:
            backgroundInstruction = `**BACKGROUND:** Simple, clean, and non-distracting, perfect for a high-end fashion lookbook. Use solid colors like off-white, beige, soft gray, or a subtle gradient.`;
            break;
    }
    
  const coreDirective = `
// AI ART DIRECTOR DIRECTIVE V13.0 - LUXE AI DOLLS //

**PRIMARY GOAL:** Create or modify a brand-new, unique, **ULTRA-REALISTIC, NATIVE 8K RESOLUTION** fashion photograph. The final image must be absolutely indistinguishable from a high-end professional photograph shot for a top online fashion brand or a viral Instagram post. The output must exhibit extreme detail, perfect clarity, and zero digital artifacts.

**CONTEXT AWARENESS:**
- **IF A REFERENCE IMAGE IS PROVIDED:** Your task is to **edit and enhance** it based on the user's prompt and the selected style. Use the provided image as the primary subject and composition. Apply the requested changes while preserving the subject's identity and the core elements of the original photo. The goal is to elevate it to the "Luxe Doll" aesthetic.
- **IF NO REFERENCE IMAGE IS PROVIDED:** Your task is to **generate a new image from scratch** based on the user's prompt and the selected style.

**CORE AESTHETIC & SUBJECT (to be applied in both generation and editing):**
1.  **SUBJECT:** The subject is always a stunning, confident woman embodying the "Instagram Baddie" or "It Girl" aesthetic. She must appear as a top fashion model or a viral influencer known for her impeccable style. Generate women of diverse backgrounds, primarily focusing on Black, Latina, and mixed-race models that are common in this subculture. She has a curvaceous, hourglass figure. She radiates confidence, luxury, and unapologetic glamour.
2.  **AESTHETIC:** "Modern E-commerce Fashion Model" meets "Soft Glam Instagram Influencer." The look is flawless, polished, trendy, and aspirational.
3.  **MAKEUP ("THE PERFECT BEAT"): This is the most critical element.** The goal is a "flawless face beat" - a state of makeup perfection with zero visible flaws, as if done by a celebrity makeup artist.
    -   **EYES:** Long, voluminous 25mm-style mink false lashes are mandatory. Eyebrows must be perfectly sculpted, arched, and filled-in ("Instagram brows"). Eyeshadow should be seamlessly blended, often featuring a sharp cut-crease or a soft glam look. A sharp, symmetrical winged eyeliner is essential.
    -   **SKIN/BASE:** The base must be absolutely flawless, with a **porcelain-like, silky matte finish**. It must look airbrushed to perfection. The finish should be **poreless**, but on extreme close-up, the finest, most realistic skin texture should be visible to avoid a plastic look. Foundation must be full coverage and perfectly blended into the hairline and neck. Contour, blush, and highlight must be seamlessly diffused with no harsh lines. A bright, blinding highlight is essential on the high points of the face (cheekbones, tip of the nose, brow bone, cupid's bow).
    -   **LIPS:** Full, plump, and glossy lips are a must. The lip liner should be crisp, slightly darker than the lipstick/gloss, and often used to slightly overline the lips for maximum volume and definition.
4.  **HAIR (CRITICAL):** The hair must be luxurious and appear to be a high-quality wig or extensions. It must have a **silky, smooth, and glossy texture**, looking healthy and impeccably styled for a major photoshoot. Common styles include: bone-straight silky hair that's extremely long; voluminous body waves; or perfectly defined, frizz-free curls. The hairline, especially with wigs, should be flawlessly "melted" with perfectly laid baby hairs/edges. NO frizzy, dry, or unnatural-looking hair.
5.  **WARDROBE:** The clothing must be on-trend, sexy, and glamorous, inspired by brands like Fashion Nova, PrettyLittleThing, and luxury streetwear. This includes: form-fitting bodysuits and catsuits, crop tops, mini dresses, luxury brand logo items (e.g., Fendi, Dior patterns), trendy denim, leather, and faux fur. Outfits should accentuate a curvy figure. Pink is a very common color.
6.  **POSES:** Poses should be confident, alluring, and influencer-inspired. Examples: selfies in a luxury bathroom or car, looking over the shoulder to showcase curves, relaxed but glamorous poses on a couch, power stances. The poses should highlight the outfit and the subject's confidence.

**TECHNICAL EXECUTION & QUALITY MANDATES:**
1.  **ABSOLUTE PHOTOREALISM:** The image must be indistinguishable from reality. Avoid the "uncanny valley" at all costs. NO digital, 3D, or overly artificial appearance.
2.  **CAMERA & LENS:** Emulate the quality of a top-tier camera like a Hasselblad X2D or Phase One IQ4, paired with a sharp 85mm or 100mm f/1.4 prime lens. The depth of field should be shallow for portraits, but for full-body shots, ensure the entire outfit is in sharp focus.
3.  **LIGHTING:** Use soft, diffused, professional studio lighting. A large softbox or beauty dish is ideal. The light should wrap around the subject, creating gentle shadows that define features without being harsh. For e-commerce shots, the lighting must be even and clearly illuminate the clothing details.
4.  ${backgroundInstruction}
5.  **SKIN TEXTURE (CRITICAL):** The skin MUST be gorgeous, glowing, and absolutely flawless, as if professionally retouched for a high-fashion magazine cover. It should have a **silky, porcelain-matte finish**. While it should appear **poreless** from a distance, it MUST retain ultra-fine, realistic skin texture to avoid a plastic or doll-like appearance. The goal is aspirational skin perfection, with a healthy, luminous 'lit-from-within' glow despite the matte finish.
6.  **DETAIL FIDELITY & ANTI-ALIASING:** All details, especially around hair, eyelashes, and fabric textures (like knitwear), must be razor-sharp and well-defined. Tonal gradations must be perfectly smooth. There should be absolutely no jagged edges, moiré patterns, or pixelation.
7.  **FINAL FINISH:** The image must have a clean, silky, professional finish, as if color-graded by a top industry professional. Details must be crisp, colors accurate and rich.

**NEGATIVE CONSTRAINTS:**
-   NO distorted hands, weird artifacts, or unnatural features.
-   NO logos, text, or watermarks unless specified in the prompt.
-   NO harsh shadows or amateurish lighting.
-   NO patchy makeup, unblended eyeshadow, or harsh contour lines.
-   **NO VISIBLE BLEMISHES OR SKIN IMPERFECTIONS.**
-   **NO PIXELATION, POSTERIZATION, OR COMPRESSION ARTIFACTS.**
-   **NO "UNCANNY VALLEY" OR ARTIFICIAL-LOOKING SKIN.**
`;

  let styleDirective = '';
  switch (style) {
    case 'Luxe Interior':
      styleDirective = `
      **STYLE CATEGORY:** 'Luxe Interior Design'. Generate a hyperrealistic image of a luxurious interior space featuring the subject. Focus on opulent materials like marble and velvet, sophisticated color palettes, and impeccable, soft lighting. The image should look like a feature in Architectural Digest.`;
      break;
    case 'Fashion Editorial':
      styleDirective = `
      **STYLE CATEGORY:** 'Fashion Editorial'. Create a medium-shot or close-up editorial photo of the subject. The setting should be luxurious and compelling. The apparel must be high-fashion. The final image must look professionally shot and edited, suitable for a Vogue or Elle cover.`;
      break;
    case 'Luxury Product':
      styleDirective = `
      **STYLE CATEGORY:** 'Luxury Product Shot'. Create a hyperrealistic commercial photograph where the subject is showcasing a luxury item (e.g., handbag, watch, perfume). The product must be a clear focus, with dramatic, studio-quality lighting and a luxurious, minimal background. The image must have sharp details and perfect colors.`;
      break;
    case 'Cyberpunk Noir':
      styleDirective = `
      **STYLE CATEGORY:** 'Cyberpunk Noir'. Create a hyperrealistic, atmospheric image blending the "Luxe Doll" aesthetic with a gritty, futuristic urban environment.
      **MOOD:** Gritty, atmospheric, and cinematic, reminiscent of 'Blade Runner' but with a high-fashion twist.
      **ENVIRONMENT:** A neon-drenched city at night. Streets are slick with rain, reflecting the vibrant glow of holographic advertisements and neon signs.
      **LIGHTING:** High-contrast and dramatic. Deep shadows are pierced by sharp, colorful neon light sources.
      **FASHION & OUTFITS:** Adapt the "Luxe Doll" wardrobe for a cyberpunk world. Think sleek, form-fitting catsuits in vinyl, tailored trench coats of advanced materials, or glamorous outfits with glowing elements.`;
      break;
    case 'Cinematic Portrait':
    default:
      styleDirective = `
      **STYLE CATEGORY:** 'Cinematic Portrait'. Create a professional-quality, cinematic portrait of the subject. The style is a clean editorial portrait with a neutral studio background and a minimal monochrome look with soft, flattering lighting. The subject must be hyperrealistic and emotionally engaging, fitting the Luxe Doll aesthetic.`;
      break;
  }
  return `${coreDirective}\n${styleDirective}`;
}

export const generateImage = async (
    prompt: string,
    style: string,
    season: string | null,
    framing: string,
    background: string,
    referencePhoto: File | null,
): Promise<GenerateResult[]> => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY_MISSING");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    try {
        const baseStyle = style.replace(/ v2$/, '');
        const baseSeason = season?.replace(/ v2$/, '');
        const baseFraming = framing.replace(/ v2$/, '');
        const baseBackground = background.replace(/ v2$/, '');

        const seasonText = baseSeason && baseSeason !== 'None' ? ` The scene should be set in ${baseSeason}.` : '';
        const framingText = ` The final image must be a ${baseFraming.toLowerCase()} shot.`;
        const userPrompt = `${prompt}.${seasonText}${framingText}`;
        
        const systemInstruction = getSystemInstruction(baseStyle, baseBackground, !!referencePhoto);
        const fullPrompt = `${systemInstruction}\n\n**USER REQUEST:** ${userPrompt}`;

        const parts: any[] = [{ text: fullPrompt }];
        if (referencePhoto) {
            const imagePart = await fileToGenerativePart(referencePhoto);
            if (imagePart) {
                parts.unshift(imagePart); // Add image before prompt
            }
        }

        const response = await ai.models.generateContent({
            model: model,
            contents: { parts: parts },
            config: {
                responseModalities: [Modality.IMAGE],
                temperature: 0.9,
            },
        });

        const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);

        if (!imagePart?.inlineData) {
            console.warn("API returned no images.", response);
            // Check for safety ratings
            if (response.candidates?.[0]?.finishReason === 'SAFETY') {
                throw new Error("SAFETY_BLOCK");
            }
            throw new Error("NO_IMAGE_RETURNED");
        }

        const results: GenerateResult[] = [{
            image: imagePart.inlineData.data,
            mimeType: imagePart.inlineData.mimeType,
        }];

        return results;

    } catch (error) {
        if (error instanceof Error && ["API_KEY_MISSING", "NO_IMAGE_RETURNED", "SAFETY_BLOCK"].includes(error.message)) {
            throw error; // Re-throw custom errors
        }

        console.error("Error calling Gemini API:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);

        if (errorMessage.includes("API key not valid") || errorMessage.includes("permission to access") || errorMessage.includes("Requested entity was not found")) {
            throw new Error("INVALID_KEY");
        }

        if (errorMessage.includes("RESOURCE_EXHAUSTED") || errorMessage.includes("quota")) {
            throw new Error("QUOTA_EXCEEDED");
        }
        
        if (errorMessage.toLowerCase().includes('safety')) {
            throw new Error("SAFETY_BLOCK");
        }
        
        throw new Error("UNKNOWN_API_ERROR");
    }
};