import { ImageFeatures, Preset, HairStyle } from '../types';

/**
 * Analyzes uploaded reference images to create detailed feature profile.
 * NOTE: This is a mock function. In a real application, this would involve
 * a multimodal model to extract features from the uploaded images.
 */
export function analyzeReferenceImages(): ImageFeatures {
  return {
    // Facial Structure
    faceShape: "Heart-shaped face with high, sculpted cheekbones, defined jawline, elegant proportions",
    faceWidth: "Medium width with balanced proportions",
    chinShape: "Gently rounded chin with subtle point",
    cheekbones: "High, prominent cheekbones with natural definition",
    
    // Eyes (Critical for consistency)
    eyeShape: "Large almond-shaped eyes with slight upward tilt at outer corners",
    eyeSize: "Large, expressive, proportionally wide",
    eyeSpacing: "Well-spaced, slightly wider than one eye width apart",
    eyeColor: "Rich hazel-brown with golden amber flecks, warm tones, visible depth",
    irisDetail: "Complex color pattern with darker limbal ring, golden brown center, amber highlights",
    pupilSize: "Medium, natural dilation",
    upperLid: "Smooth upper lid with defined crease, generous lid space",
    lowerLid: "Smooth with slight natural fullness",
    eyeWhites: "Clear bright white sclera with subtle visible blood vessels for realism",
    
    // Eyebrows
    browShape: "Full, naturally arched brows with defined peak",
    browThickness: "Medium-full with natural individual hairs visible",
    browColor: "Dark brown matching natural hair color",
    browArch: "Natural arch positioned above outer third of eye",
    
    // Nose
    noseShape: "Straight, refined nose with smooth bridge",
    noseBridge: "Medium width, straight profile",
    noseTip: "Slightly rounded, well-defined",
    nostrils: "Proportionate, symmetrical",
    
    // Lips
    lipShape: "Full lips with defined cupid's bow",
    upperLipFullness: "Medium full with clear cupid's bow definition",
    lowerLipFullness: "Full, slightly fuller than upper lip",
    lipColor: "Natural pink-brown tone",
    lipTexture: "Smooth with natural texture lines",
    
    // Skin
    skinTone: "Rich warm honey-brown complexion, medium-deep tone",
    skinUndertone: "Warm golden undertones",
    skinTexture: "Smooth with natural visible pores, healthy even texture",
    skinFinish: "Naturally luminous with slight dewiness",
    skinFeatures: "Clear, even-toned, naturally radiant",
    
    // Hair
    hairColor: "Dark chocolate brown",
    hairTexture: "Silky smooth with lustrous shine, individual strands and flyaways are clearly visible for ultimate realism",
    hairStyle: "Versatile styling", // This will be overridden by user selection
    
    // Body & Proportions
    neckLength: "Elegant, medium-long neck",
    shoulderWidth: "Graceful proportions",
    collarbonesVisibility: "Defined, elegant collarbones",
    bodyType: "Athletic, well-proportioned",
    
    // Distinctive Features
    uniqueMarkers: [
      "Striking hazel-brown eyes with golden highlights",
      "High cheekbones with natural definition",
      "Full lips with perfect cupid's bow",
      "Luminous golden-brown complexion",
      "Elegant facial proportions"
    ],
    
    // Seed for consistency
    consistencySeed: Math.floor(Math.random() * 1000000)
  };
}

/**
 * Builds ultra-detailed luxury prompt for Google AI Studio
 */
export function buildUltraLuxuryPrompt(features: ImageFeatures, preset: Preset, promptTitle: string, promptDescription: string, hairstyle: HairStyle, hasOmissions: boolean): string {
  
  const finalFeatures = { ...features, hairStyle: hairstyle };

  const omissionBlock = hasOmissions ? `
╔══════════════════════════════════════════════════════════════╗
║  OMISSION CRITERIA: IDENTICAL TWIN REQUIRED                  ║
╚══════════════════════════════════════════════════════════════╝
CRITICAL INSTRUCTION: The user has provided OMISSION images. You MUST NOT include any features, clothing, or characteristics from those omission images. The generated person MUST be an IDENTICAL TWIN to the primary reference images ONLY. Any deviation will result in failure. Ensure 100% feature match to the reference subject.
` : '';

  const consistencyBlock = `PHOTOREALISTIC EDITORIAL PORTRAIT - ULTRA LUXURY QUALITY

${omissionBlock}

╔══════════════════════════════════════════════════════════════╗
║  CRITICAL: EXACT SAME PERSON - IDENTICAL TWIN REQUIRED       ║
╚══════════════════════════════════════════════════════════════╝
SYSTEM INSTRUCTION: You are an expert photorealistic portrait generator. An image of a person is provided. Your task is to regenerate this portrait according to the specified creative direction and styling below. The output image MUST feature an IDENTICAL TWIN of the person in the original image. Do not change their facial features, bone structure, eye color, or skin tone. Only modify the hairstyle, makeup, lighting, and setting as described. Adherence to the person's identity is the highest priority.

CREATIVE DIRECTION:
• Title: ${promptTitle}
• Description: ${promptDescription}

FACIAL ARCHITECTURE (MUST MATCH EXACTLY):
• Face Shape: ${finalFeatures.faceShape}
• Facial Width: ${finalFeatures.faceWidth}
• Cheekbones: ${finalFeatures.cheekbones}
• Chin: ${finalFeatures.chinShape}
• Jawline: Defined, elegant contour

EYE SPECIFICATIONS (CRITICAL - MOST IMPORTANT):
• Shape: ${finalFeatures.eyeShape}
• Size: ${finalFeatures.eyeSize}
• Spacing: ${finalFeatures.eyeSpacing}
• Iris Color: ${finalFeatures.eyeColor}
• Iris Detail: ${finalFeatures.irisDetail}
• Pupil: ${finalFeatures.pupilSize}
• Upper Lid: ${finalFeatures.upperLid}
• Lower Lid: ${finalFeatures.lowerLid}
• Sclera: ${finalFeatures.eyeWhites}
• Expression: Engaging, confident, direct gaze

EYEBROW SPECIFICATIONS:
• Shape: ${finalFeatures.browShape}
• Thickness: ${finalFeatures.browThickness}
• Color: ${finalFeatures.browColor}
• Arch: ${finalFeatures.browArch}

NOSE SPECIFICATIONS:
• Overall Shape: ${finalFeatures.noseShape}
• Bridge: ${finalFeatures.noseBridge}
• Tip: ${finalFeatures.noseTip}
• Nostrils: ${finalFeatures.nostrils}

LIP SPECIFICATIONS:
• Shape: ${finalFeatures.lipShape}
• Upper Lip: ${finalFeatures.upperLipFullness}
• Lower Lip: ${finalFeatures.lowerLipFullness}
• Natural Color: ${finalFeatures.lipColor}

SKIN SPECIFICATIONS:
• Tone: ${finalFeatures.skinTone}
• Undertone: ${finalFeatures.skinUndertone}
• Texture: ${finalFeatures.skinTexture}
• Finish: ${finalFeatures.skinFinish}

HAIR SPECIFICATIONS (CRITICAL FOR REALISM):
• Style: ${finalFeatures.hairStyle}
• Color: ${finalFeatures.hairColor}
• Texture: ${finalFeatures.hairTexture}
• Realism: Hyper-realistic, with fine individual strands, subtle flyaways, and natural light interaction. Each strand should be rendered with perfect clarity.
• Sheen: A healthy, silky, and lustrous sheen that reflects light naturally. Avoids any artificial, plastic, or greasy appearance.
• Flow & Volume: Natural movement, volume, and flow, respecting gravity and the model's pose. The hair should look soft and touchable.

DISTINCTIVE IDENTIFYING FEATURES:
${finalFeatures.uniqueMarkers.map(marker => `• ${marker}`).join('\n')}
`;

  const presetPrompts: Record<Preset, string> = {
    "Golden Hour Glow": `
╔══════════════════════════════════════════════════════════════╗
║                  PRESET: GOLDEN HOUR GLOW                    ║
╚══════════════════════════════════════════════════════════════╝
MAKEUP: Luminous, dewy foundation. Bronze and gold tones on eyes. Glossy nude lips. Sun-kissed blush. Face and body highlighter for a radiant, wet-skin look.
STYLING: Flowing silk or linen resort wear, stylish swimwear, delicate gold jewelry. Barefoot or elegant sandals.
POSE & EXPRESSION: Relaxed, candid, joyful. Laughing, looking over the shoulder, interacting with the environment.
LIGHTING: Intense, warm backlighting from a low sun (golden hour). Lens flare is encouraged. Soft fill light illuminates the face.
BACKGROUND: Luxury beach resort, infinity pool overlooking the ocean, tropical villa at sunset.
`,
    "Red Carpet Glam": `
╔══════════════════════════════════════════════════════════════╗
║                  PRESET: RED CARPET GLAM                     ║
╚══════════════════════════════════════════════════════════════╝
MAKEUP: Flawless matte foundation, dramatic smokey eye or sharp winged liner, bold red or deep nude lip. Sculpted contour and beaming highlighter.
STYLING: An opulent, floor-length couture gown made of sequins, silk, or velvet. Statement diamond jewelry. Elegant updo or Hollywood waves.
POSE & EXPRESSION: Powerful, confident. Hand on hip, looking directly at the camera, poised and elegant.
LIGHTING: Paparazzi-style flashes from multiple angles creating dynamic, crisp highlights and shadows. A key light beautifully sculpts the face.
BACKGROUND: A glamorous red carpet event entrance with flashbulbs, or a dramatic, dark, opulent hall.
`,
    "Urban Couture": `
╔══════════════════════════════════════════════════════════════╗
║                   PRESET: URBAN COUTURE                      ║
╚══════════════════════════════════════════════════════════════╝
MAKEUP: Edgy and graphic. Sharp eyeliner, glossy or matte bold lips, clean skin. Can be experimental.
STYLING: High-fashion streetwear. Designer puffer jackets, leather, deconstructed denim, chunky sneakers or stilettos.
POSE & EXPRESSION: Strong, assertive, dynamic. Walking towards the camera, leaning against a graffiti wall, powerful stance.
LIGHTING: Cinematic night lighting. Neon signs, car headlights, wet pavement reflections creating a moody, atmospheric scene. High contrast.
BACKGROUND: Gritty, stylish urban environment at night. A rain-slicked alleyway with neon signs, a graffiti-covered wall, a rooftop overlooking city lights.
`,
    "Ethereal Dreamscape": `
╔══════════════════════════════════════════════════════════════╗
║                PRESET: ETHEREAL DREAMSCAPE                   ║
╚══════════════════════════════════════════════════════════════╝
MAKEUP: Iridescent highlighter, pastel eyeshadows, glossy lids, and lips. Glitter or small gems on the face.
STYLING: Flowing, translucent fabrics, dresses adorned with feathers, pearls, or glowing elements.
POSE & EXPRESSION: Serene, peaceful, almost floating. Eyes closed or a gentle gaze.
LIGHTING: Soft, diffused, magical lighting. Backlighting to create a halo effect. Hazy, foggy, or misty atmosphere. Light rays filtering through.
BACKGROUND: A surreal fantasy landscape. A field of glowing flowers, floating among clouds, an enchanted forest with bioluminescent plants.
`,
    "Influencer Aesthetic": `
╔══════════════════════════════════════════════════════════════╗
║                PRESET: INFLUENCER AESTHETIC                  ║
╚══════════════════════════════════════════════════════════════╝
MAKEUP: On-trend "soft glam" look. Fluffy brows, winged liner, pinky-nude matte lips. Perfectly blended.
STYLING: Trendy, brand-name casual wear (e.g., Miu Miu, Chanel), or a cute themed outfit. Holding a popular product or prop.
POSE & EXPRESSION: Relatable yet curated. A selfie in a chic mirror, unboxing a product, a candid-looking laugh.
LIGHTING: Bright, flattering natural light from a window, or a ring light for a flawless look. Soft shadows.
BACKGROUND: Aesthetically pleasing interior. A stylish bedroom with neon signs, a chic living room, or a trendy cafe.
`,
    "Commercial Beauty": `
╔══════════════════════════════════════════════════════════════╗
║                 PRESET: COMMERCIAL BEAUTY                    ║
╚══════════════════════════════════════════════════════════════╝
MAKEUP: Immaculate and flawless. Focus on one feature, like perfect skin, bold lips, or stunning eyes. Clean and precise application.
STYLING: Simple, often off-the-shoulder top in a neutral color (white, black, nude) to draw all attention to the face. No distracting jewelry.
POSE & EXPRESSION: Close-up or macro shot. Direct gaze into the lens. Face slightly angled. Hands may be near face showcasing perfect nails.
LIGHTING: Clean, high-key studio lighting using a beauty dish or large softbox. Eliminates most shadows for a fresh, bright look.
BACKGROUND: A seamless, solid color background (often white, grey, or a soft pastel) to ensure no distractions.
`,
    "Cozy Holiday": `
╔══════════════════════════════════════════════════════════════╗
║                   PRESET: COZY HOLIDAY                       ║
╚══════════════════════════════════════════════════════════════╝
MAKEUP: Natural and warm. A touch of shimmer on the eyes, rosy cheeks, and a berry-tinted lip.
STYLING: A cozy knit sweater, plush robe, or festive pajamas. Holding a mug of hot cocoa or wrapping a gift.
POSE & EXPRESSION: Warm, happy, and intimate. Smiling genuinely, looking at a Christmas tree, snuggled in a blanket.
LIGHTING: Warm, soft light from fairy lights, a fireplace, or candles. Creates a cozy, inviting ambiance (bokeh effect).
BACKGROUND: A beautifully decorated living room with a Christmas tree, a festive storefront, or a cozy, snowy cabin interior.
`,
    "Luxury Lifestyle": `
╔══════════════════════════════════════════════════════════════╗
║                 PRESET: LUXURY LIFESTYLE                     ║
╚══════════════════════════════════════════════════════════════╝
MAKEUP: Polished and sophisticated. A classic "old money" look. Understated but perfect.
STYLING: Designer clothing, timeless pieces. A luxury handbag (e.g., Hermès, Chanel) is often featured. Elegant jewelry.
POSE & EXPRESSION: Effortlessly chic and poised. In a luxury car, relaxing in a high-rise apartment, stepping out of a boutique.
LIGHTING: Crisp, clean, natural light that looks expensive. Soft morning or afternoon light filling a luxurious space.
BACKGROUND: An opulent setting. A modern penthouse with city views, the interior of a private jet, a yacht, or a designer store.
`,
    "Vintage Film": `
╔══════════════════════════════════════════════════════════════╗
║                    PRESET: VINTAGE FILM                      ║
╚══════════════════════════════════════════════════════════════╝
MAKEUP: A look from a specific era, e.g., 60s winged liner, 90s brown lipstick, or 70s sun-kissed look.
STYLING: Fashion inspired by the 70s, 80s, or 90s. High-waisted jeans, vintage band tees, retro patterns.
POSE & EXPRESSION: Candid, unposed, capturing a moment in time.
LIGHTING: Simulates film photography. Slightly desaturated colors, soft contrast, and visible film grain.
BACKGROUND: A retro-looking location. A vintage car, a record store, a classic diner. Shot on Portra 400, 35mm film grain, cinematic color grading.
`,
    "Monochrome Power": `
╔══════════════════════════════════════════════════════════════╗
║                 PRESET: MONOCHROME POWER                     ║
╚══════════════════════════════════════════════════════════════╝
MAKEUP: High-contrast. May include a dark lip or a sharp, defined eye to stand out in black and white. Highlight and contour are exaggerated.
STYLING: Focus on texture and form. Leather, silk, knitwear, or interesting silhouettes.
POSE & EXPRESSION: Strong, dramatic, and emotive. Can be a powerful portrait or a full-body shot with architectural lines.
LIGHTING: High-contrast, dramatic lighting (chiaroscuro). Hard light source to create deep shadows and bright highlights.
BACKGROUND: Simple, often dark or textured, to avoid distracting from the subject. Studio setting or architectural location. High-contrast black and white, deep blacks, crisp whites, rich tonality.
`
  };

  const technicalQualityBlock = `
╔══════════════════════════════════════════════════════════════╗
║           CRITICAL QUALITY & TECHNICAL REQUIREMENTS          ║
╚══════════════════════════════════════════════════════════════╝
RESOLUTION & FORMAT: 8K ultra high definition. Simulated RAW medium format digital quality for maximum color depth and detail.
PHOTOREALISTIC DETAIL: Every skin pore, individual eyelash, and hair strand must be visible and hyper-realistic. Natural skin texture is essential.
LIGHTING QUALITY: Professional studio lighting with natural shadow falloff, realistic color temperature, and accurate specular highlights on the skin and in the eyes.
PHOTOGRAPHIC AUTHENTICITY: Realistic depth of field from a portrait lens (e.g., 85mm f/1.4). Tack-sharp focus on the eyes is non-negotiable.
POST-PROCESSING: Must emulate a high-end fashion magazine retouching standard, including frequency separation for skin, and dodge and burn for dimension, while preserving natural texture.
FINAL OUTPUT: Must be indistinguishable from a professional photograph taken by a world-class photographer.
`;
  
  const negativePrompt = `
NEGATIVE PROMPT (What to avoid):
cartoon, anime, illustration, painting, drawing, sketch, CGI, 3D render, unnatural, fake, plastic skin, doll-like, uncanny valley, bad anatomy, deformed, disfigured, extra limbs, missing limbs, fused fingers, too many fingers, malformed hands, blurry, out of of focus, low quality, low resolution, pixelated, compression artifacts, watermark, text, signature, username, distorted face, asymmetrical eyes, unrealistic eyes, dead eyes, cross-eyed, wrong eye color, mutation, bad proportions, cloned face.
`;

  return consistencyBlock + presetPrompts[preset] + technicalQualityBlock + negativePrompt;
}