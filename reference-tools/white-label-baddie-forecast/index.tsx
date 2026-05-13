import React, { useState, useCallback, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI, Type, Modality } from "@google/genai";

const outfitDatabase = {
    spring: ["White cropped blazer with pink mini skirt and matching strappy heels.", "Baby blue knit co-ord set with silver jewelry and white sneakers.", "Floral bodycon dress with nude pumps and gold hoops.", "Mint green cropped jacket with high-waist jeans and a white bralette.", "Lilac satin mini dress with diamond choker and acrylic heels.", "White corset top with ripped jeans and pink pumps.", "Blush pink skater dress with pearl accessories and kitten heels.", "Denim mini skirt with cropped cardigan and pastel boots.", "Sky blue jogger set with white tank and silver slides.", "Floral-print two-piece with gold anklet and straw purse.", "Light-wash jeans with pink tube top and butterfly clips.", "Sheer mesh top with lace bra, white jeans, and heels.", "Pastel blazer dress with clutch and short curls.", "Pink cropped hoodie with pleated white mini skirt.", "Ruffled mini dress with ankle-wrap heels.", "Cropped denim jacket with tie-front floral top and skirt.", "Green ruched dress with transparent heels.", "White tube top with pink high-waist trousers.", "Rose gold satin slip dress with nude strappy sandals.", "White halter top with ripped mom jeans and gold hoops.", "Yellow sundress with pink heels and straw hat.", "Coral mini skirt with matching top and white mules.", "Baby blue romper with gold bangles.", "Mint bodycon midi with nude pumps.", "White corset with pastel pants and acrylic bag.", "Short floral romper with strappy wedges.", "Cropped varsity jacket with denim shorts and sneakers.", "Beige two-piece knit set with slides.", "Lemon-yellow mini dress with white heels.", "Ruffled white top with pink denim shorts.", "Soft lavender jumpsuit with clear heels.", "Ruched halter dress with strappy sandals.", "Pink bodycon with cropped jacket and high ponytail.", "White bralette with matching blazer and shorts.", "Ombre pastel set with silver accessories.", "Floral-print bodysuit with jeans.", "Sky blue skirt with lace cami.", "Puff-sleeve dress with pearls.", "Cropped jean jacket with floral romper.", "Yellow crop top with plaid skirt.", "White two-piece with floral scarf.", "Pink denim jacket with shorts.", "Sage green set with transparent heels.", "Tie-front blouse with mini skirt.", "White cropped tee with silk pants.", "Coral romper with wedges.", "Off-shoulder floral dress.", "Mint knit set with hoop earrings.", "Cropped cardigan with denim skirt.", "Soft pink wrap dress.", "Floral wrap top with jeans.", "White tank with pink cargo pants.", "Sky blue satin skirt with halter top.", "Nude corset dress.", "White flowy dress with strappy heels.", "Soft green two-piece with slides.", "Beige jumpsuit with white heels.", "Ruffled pastel set.", "Pink leather shorts with white blouse.", "Lavender tube dress.", "Cropped hoodie with tennis skirt.", "Baby blue co-ord set.", "White linen set.", "Pink wrap top with jeans.", "Mint corset with white shorts.", "Floral silk top with mini skirt.", "Sheer pink blouse with trousers.", "White knit romper.", "Off-shoulder mini dress.", "Two-tone set with heels.", "Yellow co-ord with slides.", "Cream satin set.", "Denim halter jumpsuit.", "Light-pink slip dress.", "Pastel cargo set.", "White ruched top with skirt.", "Pink blazer over romper.", "Green satin wrap dress.", "Sky blue linen romper.", "White bodycon with butterfly clips."],
    summer: ["Neon pink bikini with mesh cover-up.", "White crochet set with gold jewelry.", "Denim shorts with lime crop top.", "Yellow tube dress with strappy heels.", "Floral bikini with silk wrap skirt.", "Coral bodycon dress.", "Orange halter dress with gold hoops.", "Cut-out mini dress with heels.", "Denim jumpsuit with wedges.", "Pink shorts with crop top.", "Sheer maxi dress over swimsuit.", "Lime green romper.", "Gold metallic mini dress.", "White tank and denim skirt.", "Floral romper with clear heels.", "Color-block mini dress.", "Baby blue co-ord with bucket hat.", "Mesh top and shorts.", "White crochet dress.", "Pink bikini with kimono.", "Tropical print dress.", "Sheer neon jumpsuit.", "Denim mini with tube top.", "White crop top with flowy skirt.", "Strappy sundress.", "Orange cut-out jumpsuit.", "Metallic halter top and shorts.", "Denim vest with mini skirt.", "Zebra print two-piece.", "Rhinestone dress.", "White corset romper.", "Tie-dye dress.", "Green mesh bodysuit.", "Hot pink mini skirt.", "White linen set.", "Turquoise bikini with wrap.", "Yellow co-ord.", "Denim corset and shorts.", "White sundress.", "Leopard bikini.", "Peach mini dress.", "Denim mini with white tank.", "Coral romper.", "Neon orange skirt set.", "White jumpsuit.", "Gold halter dress.", "Pastel co-ord.", "Silver crop top with shorts.", "Floral bikini wrap set.", "Green bandeau top and shorts.", "Pink mesh dress.", "Lace crop top and mini.", "Black mini dress.", "Colorful bodycon.", "Silver romper.", "Orange two-piece.", "Denim halter dress.", "Hot pink wrap dress.", "White corset mini.", "Baby blue romper.", "Floral silk dress.", "Lime halter set.", "Pink jumpsuit.", "Orange mesh skirt.", "Rhinestone bikini.", "Pearl-trim romper.", "Satin slip dress.", "Floral co-ord.", "White lace romper.", "Mint bikini.", "Gold co-ord.", "Blue cut-out dress.", "Leopard halter dress.", "Pink bodycon.", "Floral romper.", "Hot pink corset.", "Orange lace mini.", "Blue mesh romper.", "White halter set.", "Silver jumpsuit.", "Rhinestone skirt set.", "Yellow romper."],
    fall: ["Leather mini skirt with turtleneck.", "Brown trench coat with bodysuit.", "Camel jumpsuit.", "Red corset dress with boots.", "Denim set with thigh-high boots.", "Oversized blazer with mini dress.", "Chocolate leather pants with white blouse.", "Tan knit set with heels.", "Black trench coat and bodysuit.", "Olive cargo pants and cropped sweater.", "Burgundy wrap dress.", "Denim dress with booties.", "Black tights and pleated skirt.", "Camel sweater dress.", "Brown leather set.", "White bodysuit and trench.", "Tweed skirt and top.", "Red blazer and shorts.", "Brown ruched dress.", "Cropped hoodie with leather pants.", "Black blazer with corset top.", "Olive jumpsuit.", "Brown turtleneck dress.", "Black satin set.", "Chocolate wrap coat.", "Denim romper with boots.", "Camel pantsuit.", "Olive bodycon dress.", "Brown mini skirt and cropped sweater.", "Burgundy trench.", "Plaid skirt with cardigan.", "Beige knit dress.", "Chocolate puffer jacket.", "Brown satin dress.", "Black mini dress with tights.", "Olive bomber with leggings.", "Camel corset set.", "Tweed blazer dress.", "Cream sweater set.", "Rust bodycon.", "Leopard coat with jeans.", "Burgundy leather pants.", "Chocolate jumpsuit.", "Plaid mini skirt.", "Black turtleneck dress.", "Camel knit set.", "Tan suede dress.", "Denim jacket with leggings.", "Rust trench with boots.", "Olive romper.", "Cream puffer vest set.", "Black cropped jacket.", "Brown knit co-ord.", "Camel midi dress.", "White cropped hoodie.", "Tweed mini skirt.", "Leather dress.", "Camel wrap dress.", "Black corset top with trousers.", "Rust crop set.", "Olive coat.", "Burgundy pantsuit.", "Tan bodysuit.", "Brown jumpsuit.", "Cropped trench.", "Plaid co-ord.", "Suede jacket dress.", "Brown bodysuit and pants.", "Chocolate corset.", "Black mini skirt.", "Beige knit romper.", "Brown blazer.", "Camel knit mini.", "Plaid dress.", "Tweed coat.", "Brown tights with denim shorts.", "Satin co-ord.", "Cropped turtleneck.", "Camel pants.", "Leopard skirt."],
    winter: ["White fur coat with sequin mini dress.", "Red velvet dress with boots.", "Black trench coat with tights.", "Cream knit set with fur bag.", "Gold jumpsuit.", "White bodysuit with coat.", "Silver sequin skirt.", "Black satin dress.", "Faux fur jacket.", "Leather leggings with boots.", "Camel trench coat.", "Burgundy velvet jumpsuit.", "Tweed skirt set.", "White sweater dress.", "Red coat with heels.", "Cream blazer set.", "Silver bodycon.", "Black knit jumpsuit.", "Leopard coat.", "Sequin romper.", "White jumpsuit.", "Metallic blazer.", "Brown puffer jacket.", "Gray sweater dress.", "Red leather pants.", "White coat.", "Black corset with trousers.", "Gold sequin dress.", "Red satin co-ord.", "Camel knit jumpsuit.", "Fur-trimmed mini.", "Brown corset dress.", "White velvet set.", "Leopard trench.", "Black lace dress.", "Tweed blazer.", "Cream jumpsuit.", "Camel knit set.", "Silver skirt.", "Black satin set.", "Red wrap coat.", "Gold trench.", "Cream puffer.", "Beige coat with boots.", "Red sequin romper.", "White satin dress.", "Black fur set.", "Gray trench.", "Champagne jumpsuit.", "Metallic corset dress.", "Brown velvet suit.", "Cream skirt set.", "Gold wrap dress.", "White knit romper.", "Leopard print set.", "Red faux fur jacket.", "Silver halter jumpsuit.", "Camel velvet co-ord.", "Black puffer dress.", "Gold shimmer dress.", "White trench coat.", "Satin mini with fur.", "Silver sequin coat.", "Camel wrap jumpsuit.", "Tweed pantsuit.", "Cream wrap dress.", "Gold crop set.", "Velvet romper.", "Black trench dress.", "Satin corset dress.", "Cream bodysuit.", "Camel leather skirt.", "Brown wrap coat.", "Sequin blazer.", "Cream maxi dress.", "Gold sequin romper.", "Burgundy trench coat.", "Black fur jumpsuit.", "Champagne wrap set.", "White satin gown with heels."]
};

const compositions = ['Full-body', 'Mid-body', 'Headshot'];
const ethnicities = ['Unspecified', 'African American', 'Afro-Caribbean', 'Ethiopian', 'Nigerian', 'Sudanese', 'African-European', 'Latina', 'Brazilian', 'Dominican', 'Puerto Rican', 'Caucasian', 'Irish', 'Italian', 'Middle Eastern', 'Indian', 'East Asian', 'Filipino'];
const skinTones = ['Unspecified', 'Porcelain', 'Ivory', 'Sand', 'Honey', 'Tan', 'Olive', 'Golden', 'Caramel', 'Chestnut', 'Almond', 'Toffee', 'Bronze', 'Walnut', 'Mocha', 'Espresso', 'Deep Ebony', 'Warm Ivory', 'Cool Porcelain', 'Red Undertone', 'Neutral Sand', 'Golden Honey', 'Olive Tan'];
const skinTextures = ['Unspecified', 'Smooth Matte', 'Natural Sheen', 'Soft Glam', 'Glossy Highlight', 'Freckled', 'Radiant Glow', 'Velvety Matte', 'Melanin Shimmer', 'Dewy Radiance', 'Contour-defined', 'Satin Glow', 'Sun-kissed', 'Editorial Glam'];
const hairTextures = ['Unspecified', 'Silky Straight', 'Bone Straight', 'Kinky Curly', 'Coily 4C', 'Soft Curls', 'Wavy', 'Beach Waves', 'Micro Braids', 'Box Braids', 'Faux Locs', 'Relaxed Straight', 'Coarse Afro', 'Voluminous Curls'];
const hairstyles = ['Unspecified', 'High Ponytail', 'Sleek Bun', 'Messy Bun', 'Low Ponytail', 'Middle Part Straight', 'Side Part Wave', 'Long Layers', 'Bob Cut', 'Blunt Bob', 'Pixie Cut', 'Bantu Knots', 'Braids with Beads', 'Cornrows', 'Afro Puff', 'Full Afro', 'Deep Wave', 'Wet Curls', 'Curtain Bangs', 'Hollywood Waves', 'HD Lace Frontal Wig', 'Half-up Half-down', 'Braided Ponytail', 'Platinum Blonde', 'Jet Black', 'Copper Red', 'Caramel Highlights'];

const App = () => {
    const [prompt, setPrompt] = useState('');
    const [composition, setComposition] = useState('Full-body');
    const [ethnicity, setEthnicity] = useState('Unspecified');
    const [skinTone, setSkinTone] = useState('Unspecified');
    const [skinTexture, setSkinTexture] = useState('Unspecified');
    const [hairTexture, setHairTexture] = useState('Unspecified');
    const [hairstyle, setHairstyle] = useState('Unspecified');

    const [uploadedImage, setUploadedImage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);
    const [generatedImageUrl, setGeneratedImageUrl] = useState('');
    const [favorites, setFavorites] = useState([]);

    useEffect(() => {
        try {
            const savedFavorites = localStorage.getItem('baddieFavorites');
            if (savedFavorites) setFavorites(JSON.parse(savedFavorites));
        } catch (e) { console.error("Failed to parse favorites from localStorage", e); }
    }, []);

    useEffect(() => {
        localStorage.setItem('baddieFavorites', JSON.stringify(favorites));
    }, [favorites]);

    const blobToBase64 = (blob) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => typeof reader.result === 'string' ? resolve(reader.result.split(',')[1]) : reject(new Error('Failed to convert blob to base64.'));
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });

    const handleFileChange = async (event) => {
        const file = event.target.files[0];
        if (file) {
            const base64 = await blobToBase64(file);
            setUploadedImage({ mimeType: file.type, data: base64 });
        } else {
            setUploadedImage(null);
        }
    };

    const generateForecast = useCallback(async (currentPrompt) => {
        if (!currentPrompt) {
            setError('Please describe your vibe or select a preset.');
            return;
        }

        setLoading(true);
        setError('');
        setResult(null);
        setGeneratedImageUrl('');

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

            const systemInstruction = `You are 'The Baddie Forecast,' a next-gen AI fashion designer. Your purpose is to create hyper-realistic, trend-forward fashion baddies that embody confidence, diversity, and modern luxury. Your task is to design a complete, stylish outfit based on the user's request. Always respond with a JSON object that strictly follows the provided schema. The outfit should be creative, detailed, and luxurious. For the 'pro_stylist_notes', provide specific advice on how to adapt the look for different occasions and body types. For the 'render_prompt', create a detailed description of the model wearing the complete outfit. This description should focus on the clothes and accessories ONLY. Do not describe the model's physical features, the camera settings, or the environment in the 'render_prompt', as those will be added separately.`;

            const responseSchema = {
                type: Type.OBJECT,
                properties: {
                    forecast_of_the_day: { type: Type.STRING, description: "A fun, confidence-boosting fashion quote." },
                    look_name: { type: Type.STRING, description: "A catchy name for the outfit." },
                    garments: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { piece: { type: Type.STRING }, details: { type: Type.STRING } }, required: ['piece', 'details'] } },
                    accessories: { type: Type.ARRAY, items: { type: Type.STRING } },
                    pro_stylist_notes: { type: Type.STRING, description: "Professional styling advice for this look, including tips for different occasions and body types." },
                    render_prompt: { type: Type.STRING, description: "A detailed prompt for an image generation model to create a photorealistic image of a model wearing this complete outfit in a studio." },
                },
                required: ['forecast_of_the_day', 'look_name', 'garments', 'accessories', 'pro_stylist_notes', 'render_prompt'],
            };
            
            const modelDetailsForDesign = [];
            if (ethnicity !== 'Unspecified') modelDetailsForDesign.push(ethnicity);
            if (skinTone !== 'Unspecified') modelDetailsForDesign.push(`${skinTone} skin tone`);
            const modelString = modelDetailsForDesign.length > 0 ? `The model is ${modelDetailsForDesign.join(', ')}.` : '';

            const designPrompt = `Design an outfit for: ${currentPrompt}. ${modelString}`;

            const detailsResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: designPrompt,
                config: { systemInstruction, responseMimeType: "application/json", responseSchema },
            });

            const outfitDetails = JSON.parse(detailsResponse.text);
            setResult(outfitDetails);

            let imageGenParts;
            if (uploadedImage) {
                 const imagePart = { inlineData: { mimeType: uploadedImage.mimeType, data: uploadedImage.data } };
                 const tryOnPrompt = `Using the person in the provided image as a reference, generate a photorealistic ${composition} image of them wearing this outfit: ${outfitDetails.render_prompt}. Maintain their likeness and features. The image should be 8K HD, ultra-realistic, with professional editorial quality.`;
                 imageGenParts = [imagePart, {text: tryOnPrompt}];
            } else {
                const corePrompt = `8K HD, ultra-realistic, professional editorial photoshoot, Canon EOS R5 with 85mm lens, f/1.4, cinematic studio lighting with a natural glow, full of attitude.`;
                let modelDescription = `A photorealistic image of a fashion model`;
                const features = [];
                if (ethnicity !== 'Unspecified') features.push(ethnicity);
                if (skinTone !== 'Unspecified') features.push(`${skinTone} skin tone`);
                if (skinTexture !== 'Unspecified') features.push(`${skinTexture} skin texture`);
                if (features.length > 0) modelDescription += ` who is ${features.join(', ')}`;

                if (hairstyle !== 'Unspecified' || hairTexture !== 'Unspecified') {
                    const hairParts = [];
                    if (hairstyle !== 'Unspecified') hairParts.push(hairstyle);
                    if (hairTexture !== 'Unspecified') hairParts.push(`${hairTexture} texture`);
                    modelDescription += `. Her hair is styled in a ${hairParts.join(' with a ')}`;
                }

                let compositionDescription = '';
                switch(composition) {
                    case 'Headshot': compositionDescription = 'A glamorous headshot focusing on facial beauty, makeup, hair, and accessories like earrings and necklaces.'; break;
                    case 'Mid-body': compositionDescription = 'A waist-up mid-body shot, capturing the outfit details from the torso upwards, highlighting the pose and energy.'; break;
                    default: compositionDescription = 'A full-body editorial shot showcasing the entire fashion look from head to toe, including footwear, set against a clean studio backdrop.'; break;
                }

                let finalRenderPrompt = `${compositionDescription} ${modelDescription}. The model is wearing: ${outfitDetails.render_prompt}. The look incorporates subtle luxury details from brands like Dior, Chanel, or Prada. ${corePrompt}`;
                imageGenParts = [{ text: finalRenderPrompt }];
            }

            const imageResponse = await ai.models.generateContent({
              model: 'gemini-2.5-flash-image',
              contents: { parts: imageGenParts },
              config: { responseModalities: [Modality.IMAGE] },
            });

            const firstPart = imageResponse.candidates?.[0]?.content?.parts?.[0];
            if (firstPart && firstPart.inlineData) {
                const imageUrl = `data:${firstPart.inlineData.mimeType};base64,${firstPart.inlineData.data}`;
                setGeneratedImageUrl(imageUrl);
            } else { throw new Error('Image generation failed to return an image.'); }
        } catch (e) {
            console.error(e);
            setError(e.message || 'An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [uploadedImage, ethnicity, composition, skinTone, skinTexture, hairTexture, hairstyle]);

    const handleSubmit = (event) => {
        event.preventDefault();
        generateForecast(prompt);
    };

    const handlePresetClick = (season) => {
        const randomPrompt = outfitDatabase[season][Math.floor(Math.random() * outfitDatabase[season].length)];
        setPrompt(randomPrompt);
        generateForecast(randomPrompt);
    };

    const handleFashionPresetClick = (presetPrompt) => {
        setPrompt(presetPrompt);
        generateForecast(presetPrompt);
    };

    const addToFavorites = () => {
        if (result && generatedImageUrl) {
            setFavorites(prev => [{ id: Date.now(), imageUrl: generatedImageUrl, details: result }, ...prev]);
        }
    };
    
    const handleDownload = () => {
        if (generatedImageUrl && result) {
            const link = document.createElement('a');
            link.href = generatedImageUrl;
            link.download = `${result.look_name.replace(/\s+/g, '_') || 'baddie-forecast'}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const removeFromFavorites = (id) => setFavorites(prev => prev.filter(fav => fav.id !== id));
    const isFavorited = generatedImageUrl && favorites.some(fav => fav.imageUrl === generatedImageUrl);

    const seasonalPresets = [{ name: '❄️ Winter Chill', season: 'winter' }, { name: '🌸 Spring Fling', season: 'spring' }, { name: '☀️ Summer Heat', season: 'summer' }, { name: '🍂 Autumn Vibe', season: 'fall' }];
    const fashionPresets = [{ name: 'Baddie of the Day', prompt: 'An iconic "Baddie of the Day" look that will turn heads.' }, { name: 'Streetwear Queen', prompt: 'A high-fashion streetwear look, blending luxury with urban edge.' }, { name: 'Date Night Slay', prompt: 'A sexy and sophisticated outfit perfect for a date night.' }, { name: 'Soft Life Luxe', prompt: 'An elegant and comfortable outfit embodying the "soft life" luxury aesthetic.' }];

    const Select = ({ label, value, onChange, options, disabled }) => (
        <div className="form-group">
            <label>{label}</label>
            <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled}>
                {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
        </div>
    );
    
    return (
        <>
            <style>{`
                :root { --primary-color: #ff69b4; --secondary-color: #f8f8f8; --background-color: #1a1a1a; --text-color: #ffffff; --card-color: #2a2a2a; --border-color: #444; }
                .app-container { max-width: 1200px; margin: 0 auto; padding: 2rem; min-height: 100vh; }
                header { text-align: center; margin-bottom: 2rem; }
                header h1 { font-size: 2.5rem; color: var(--primary-color); margin: 0; }
                header p { font-size: 1.1rem; color: var(--secondary-color); opacity: 0.8; }
                main { display: grid; grid-template-columns: 1fr 2fr; gap: 2rem; margin-bottom: 3rem; }
                .controls { background-color: var(--card-color); padding: 1.5rem; border-radius: 12px; border: 1px solid var(--border-color); align-self: start; }
                h2 { margin-top: 0; color: var(--primary-color); border-bottom: 2px solid var(--primary-color); padding-bottom: 0.5rem; margin-bottom: 1.5rem; }
                h3.control-section-title { font-size: 1rem; color: var(--secondary-color); opacity: 0.9; margin-top: 2rem; margin-bottom: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; }
                .form-group { margin-bottom: 1.25rem; }
                label { display: block; margin-bottom: 0.5rem; font-weight: 600; font-size: 0.9rem; }
                .preset-buttons { display: flex; flex-wrap: wrap; gap: 0.5rem; }
                .preset-btn { flex-grow: 1; padding: 0.5rem 0.75rem; background-color: transparent; color: var(--primary-color); border: 1px solid var(--primary-color); border-radius: 8px; cursor: pointer; font-size: 0.85rem; transition: all 0.2s ease-in-out; }
                .preset-btn:hover:not(:disabled) { background-color: var(--primary-color); color: var(--background-color); }
                .info-text { font-size: 0.8rem; opacity: 0.7; display: block; margin-top: 0.5rem; }
                textarea { width: 100%; min-height: 120px; background-color: var(--background-color); border: 1px solid var(--border-color); border-radius: 8px; color: var(--text-color); padding: 0.75rem; font-family: inherit; font-size: 1rem; resize: vertical; }
                textarea:focus { outline: none; border-color: var(--primary-color); box-shadow: 0 0 0 3px #ff69b440; }
                select { width: 100%; padding: 0.75rem; background-color: var(--background-color); border: 1px solid var(--border-color); border-radius: 8px; color: var(--text-color); font-size: 0.9rem; -webkit-appearance: none; -moz-appearance: none; appearance: none; background-image: url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M5%208l5%205%205-5z%22%20fill%3D%22%23ff69b4%22/%3E%3C/svg%3E'); background-repeat: no-repeat; background-position: right 0.75rem center; background-size: 1.2em; }
                select:focus { outline: none; border-color: var(--primary-color); box-shadow: 0 0 0 3px #ff69b440; }
                select:disabled, .preset-btn:disabled, .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
                .file-input-label { display: inline-block; padding: 0.75rem 1.5rem; background-color: var(--background-color); color: var(--primary-color); border: 1px solid var(--primary-color); border-radius: 8px; cursor: pointer; text-align: center; transition: all 0.2s ease-in-out; }
                .file-input-label:hover { background-color: var(--primary-color); color: var(--background-color); }
                input[type="file"] { display: none; }
                .file-name { display: block; margin-top: 0.5rem; font-size: 0.9rem; opacity: 0.7; }
                .submit-btn { width: 100%; padding: 1rem; background: linear-gradient(45deg, var(--primary-color), #ff85c1); border: none; border-radius: 8px; color: var(--background-color); font-size: 1.1rem; font-weight: 700; cursor: pointer; transition: transform 0.2s ease; margin-top: 1rem; }
                .submit-btn:not(:disabled):hover { transform: translateY(-2px); box-shadow: 0 4px 15px #ff69b450; }
                .output { background-color: var(--card-color); padding: 1.5rem; border-radius: 12px; border: 1px solid var(--border-color); min-height: 500px; display: flex; flex-direction: column; justify-content: center; align-items: center; }
                .placeholder { text-align: center; color: var(--secondary-color); opacity: 0.6; } .placeholder-icon { font-size: 4rem; }
                .loader { border: 4px solid #f3f3f330; border-top: 4px solid var(--primary-color); border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; } @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                .error { color: #ff8080; background-color: #ff333320; padding: 1rem; border-radius: 8px; border: 1px solid #ff8080; }
                .result-container { width: 100%; display: flex; flex-direction: column; gap: 1.5rem; }
                .generated-image-wrapper { position: relative; width: 100%; aspect-ratio: 1 / 1; background-color: var(--background-color); border-radius: 8px; overflow: hidden; display: flex; justify-content: center; align-items: center; }
                .generated-image { width: 100%; height: 100%; object-fit: cover; }
                .image-actions { position: absolute; top: 1rem; right: 1rem; display: flex; flex-direction: column; gap: 0.5rem; }
                .action-btn { background: rgba(0, 0, 0, 0.5); border: 1px solid #fff; color: #fff; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; display: flex; justify-content: center; align-items: center; font-size: 1.5rem; transition: all 0.2s ease; padding: 0; }
                .action-btn:hover:not(:disabled) { background: var(--primary-color); border-color: var(--primary-color); }
                .action-btn:disabled { cursor: not-allowed; background: rgba(0, 0, 0, 0.7); color: #888; }
                .outfit-details { width: 100%; }
                .forecast-quote { font-style: italic; text-align: center; padding: 1rem; background-color: var(--background-color); border-radius: 8px; margin-bottom: 1.5rem; border-left: 4px solid var(--primary-color); }
                .detail-card { background-color: var(--background-color); padding: 1rem; border-radius: 8px; margin-bottom: 1rem; }
                .detail-card h3 { margin-top: 0; color: var(--primary-color); font-size: 1.1rem; }
                .detail-card ul { padding-left: 20px; margin: 0; } .detail-card li { margin-bottom: 0.5rem; }
                .favorites-section { padding-top: 2rem; border-top: 1px solid var(--border-color); }
                .favorites-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1.5rem; }
                .favorite-card { position: relative; background-color: var(--card-color); border-radius: 12px; overflow: hidden; border: 1px solid var(--border-color); transition: all 0.2s ease-in-out; }
                .favorite-card:hover { transform: translateY(-3px); box-shadow: 0 6px 20px rgba(0,0,0,0.25); }
                .favorite-card img { width: 100%; aspect-ratio: 1 / 1; object-fit: cover; display: block; }
                .favorite-card-info { padding: 1rem; }
                .favorite-card h4 { margin: 0 0 0.5rem 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .remove-btn { position: absolute; top: 0.5rem; right: 0.5rem; background: rgba(0,0,0,0.6); color: white; border: none; border-radius: 50%; width: 30px; height: 30px; cursor: pointer; font-size: 1rem; display: flex; align-items: center; justify-content: center; line-height: 1; transition: background-color 0.2s; }
                .remove-btn:hover { background-color: rgba(255, 50, 50, 0.8); }
                footer { text-align: center; margin-top: 3rem; padding-top: 2rem; padding-bottom: 1rem; border-top: 1px solid var(--border-color); color: var(--secondary-color); font-size: 0.9rem; opacity: 0.7; line-height: 1.6; }
                @media (max-width: 768px) { main { grid-template-columns: 1fr; } .output { min-height: 300px; } .favorites-grid { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); } }
            `}</style>
            <div className="app-container">
                <header>
                    <h1>The Baddie Forecast 🌸</h1>
                    <p>Your AI Personal Stylist for the Perfect Slay</p>
                </header>
                <main>
                    <div className="controls">
                        <form onSubmit={handleSubmit}>
                            <h2>Create Your Look</h2>
                            <div className="form-group">
                                <label>Quick Start (Seasonal)</label>
                                <div className="preset-buttons">
                                    {seasonalPresets.map(p => <button key={p.name} type="button" className="preset-btn" onClick={() => handlePresetClick(p.season)} disabled={loading}>{p.name}</button>)}
                                </div>
                            </div>
                            <div className="form-group">
                                 <label>Fashion Forecast</label>
                                 <div className="preset-buttons">
                                    {fashionPresets.map(p => <button key={p.name} type="button" className="preset-btn" onClick={() => handleFashionPresetClick(p.prompt)} disabled={loading}>{p.name}</button>)}
                                 </div>
                            </div>
                             <div className="form-group">
                                <label htmlFor="prompt">Or Describe Your Vibe</label>
                                <textarea id="prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g., 'a chic but edgy outfit for a night out in NYC'" />
                            </div>

                            <h3 className="control-section-title">Model Customization</h3>
                            {uploadedImage && <small className="info-text">Model details are determined by the uploaded photo.</small>}
                            
                            <Select label="Composition Mode" value={composition} onChange={setComposition} options={compositions} disabled={loading} />
                            <Select label="Ethnicity" value={ethnicity} onChange={setEthnicity} options={ethnicities} disabled={loading || !!uploadedImage} />
                            <Select label="Skin Tone" value={skinTone} onChange={setSkinTone} options={skinTones} disabled={loading || !!uploadedImage} />
                            <Select label="Skin Texture" value={skinTexture} onChange={setSkinTexture} options={skinTextures} disabled={loading || !!uploadedImage} />
                            <Select label="Hair Texture" value={hairTexture} onChange={setHairTexture} options={hairTextures} disabled={loading || !!uploadedImage} />
                            <Select label="Hairstyle" value={hairstyle} onChange={setHairstyle} options={hairstyles} disabled={loading || !!uploadedImage} />
                            
                            <h3 className="control-section-title">Virtual Try-On</h3>
                            <div className="form-group">
                                <label htmlFor="file-upload" className="file-input-label">Upload a Photo</label>
                                <input id="file-upload" type="file" accept="image/*" onChange={handleFileChange} disabled={loading} />
                                {uploadedImage && <span className="file-name">Image selected!</span>}
                            </div>
                             <button type="submit" className="submit-btn" disabled={loading}>{loading ? 'Forecasting...' : 'Generate Forecast'}</button>
                        </form>
                    </div>
                    <div className="output">
                        {loading && (<div><div className="loader"></div><p style={{textAlign: 'center', marginTop: '1rem'}}>Generating your slay...</p></div>)}
                        {error && <div className="error">{error}</div>}
                        {!loading && !error && !result && (<div className="placeholder"><span className="placeholder-icon">✨</span><h3>Your Next Iconic Look Awaits</h3><p>Describe your style and let the AI work its magic.</p></div>)}
                        {result && (
                           <div className="result-container">
                                {generatedImageUrl ? (
                                    <div className="generated-image-wrapper">
                                        <img src={generatedImageUrl} alt={result.look_name} className="generated-image" />
                                        <div className="image-actions">
                                            <button className="action-btn" onClick={addToFavorites} disabled={isFavorited} title={isFavorited ? "Already in favorites" : "Save to favorites"}>{isFavorited ? '❤️' : '♡'}</button>
                                            <button className="action-btn" onClick={handleDownload} title="Download Image">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                            </button>
                                        </div>
                                    </div>
                                ) : (<div className="generated-image-wrapper"><div className="loader"></div></div>)}
                                <div className="outfit-details">
                                    <p className="forecast-quote">"{result.forecast_of_the_day}"</p>
                                    <div className="detail-card"><h3>Look: {result.look_name}</h3><ul>{result.garments.map((g, i) => (<li key={i}><strong>{g.piece}:</strong> {g.details}</li>))}</ul></div>
                                    <div className="detail-card"><h3>Accessories</h3><ul>{result.accessories.map((a, i) => <li key={i}>{a}</li>)}</ul></div>
                                    <div className="detail-card"><h3>Pro Stylist Notes</h3><p>{result.pro_stylist_notes}</p></div>
                                </div>
                           </div>
                        )}
                    </div>
                </main>
                {favorites.length > 0 && (
                    <section className="favorites-section">
                        <h2>Your Favorite Looks</h2>
                        <div className="favorites-grid">
                            {favorites.map(fav => (
                                <div key={fav.id} className="favorite-card">
                                    <img src={fav.imageUrl} alt={fav.details.look_name} />
                                    <button className="remove-btn" onClick={() => removeFromFavorites(fav.id)} title="Remove from favorites">🗑️</button>
                                    <div className="favorite-card-info"><h4>{fav.details.look_name}</h4></div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
                <footer>
                    <p>&copy; 2025 Siderra Davis <br /> ( @Low.Ticket Millionaire ) <br /> All Rights Reserved.</p>
                </footer>
            </div>
        </>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);