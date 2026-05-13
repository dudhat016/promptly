import React, { useState } from 'react';
import { TwininOptions } from '../types';
import {
  ETHNICITY_OPTIONS, HAIR_COLOR_OPTIONS, HAIR_STYLE_OPTIONS, EXPRESSION_OPTIONS, POSE_OPTIONS,
  MAKEUP_STYLE_OPTIONS, MAKEUP_BRAND_OPTIONS, DESIGNER_VIBE_OPTIONS, SCENE_TYPE_OPTIONS, CHRISTMAS_SCENE_OPTIONS,
  COMPLEXION_PRESETS
} from '../constants';

interface OptionsPanelProps {
  options: TwininOptions;
  setOptions: React.Dispatch<React.SetStateAction<TwininOptions>>;
  isOutfitSwitchMode: boolean;
}

type Tab = 'Appearance' | 'Hair' | 'Style' | 'Scene' | 'Output';

const CustomSelect: React.FC<{
  id: keyof TwininOptions;
  label: string;
  value: string;
  options: readonly string[];
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  disabled?: boolean;
}> = ({ id, label, value, options, onChange, disabled }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-semibold text-[#D4007F]">{label}</label>
    <select
      id={id}
      name={id}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-[#FF4FA3] focus:border-[#FF4FA3] sm:text-sm rounded-md disabled:bg-gray-100"
    >
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  </div>
);

const CustomTextArea: React.FC<{
    id: keyof TwininOptions;
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    placeholder: string;
    rows?: number;
}> = ({ id, label, value, onChange, placeholder, rows=3 }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-semibold text-[#D4007F]">{label}</label>
        <textarea
            id={id}
            name={id}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            rows={rows}
            className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md focus:ring-[#FF4FA3] focus:border-[#FF4FA3]"
        />
    </div>
);


export const OptionsPanel: React.FC<OptionsPanelProps> = ({ options, setOptions, isOutfitSwitchMode }) => {
  const [activeTab, setActiveTab] = useState<Tab>('Appearance');

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setOptions(prev => ({ ...prev, [name]: value }));
  };
  
  const tabs: Tab[] = ['Appearance', 'Hair', 'Style', 'Scene', 'Output'];

  const renderContent = () => {
    switch (activeTab) {
      case 'Appearance':
        return (
          <div className="space-y-4">
            <CustomSelect id="ethnicity" label="Ethnicity" value={options.ethnicity} options={ETHNICITY_OPTIONS} onChange={handleChange} disabled={isOutfitSwitchMode} />
            <CustomSelect id="complexion" label="Complexion" value={options.complexion} options={COMPLEXION_PRESETS} onChange={handleChange} disabled={isOutfitSwitchMode} />
            <CustomTextArea id="skin_description" label="Skin Description" value={options.skin_description} onChange={handleChange} placeholder="e.g., warm golden brown with soft freckles" />
            <div className="grid grid-cols-2 gap-4">
              <CustomSelect id="freckles" label="Freckles" value={options.freckles} options={['none', 'soft', 'medium', 'heavy']} onChange={handleChange} disabled={isOutfitSwitchMode}/>
              <CustomSelect id="dimples" label="Dimples" value={options.dimples} options={['none', 'subtle', 'defined']} onChange={handleChange} disabled={isOutfitSwitchMode}/>
            </div>
             <CustomSelect id="expression" label="Expression" value={options.expression} options={EXPRESSION_OPTIONS} onChange={handleChange} disabled={isOutfitSwitchMode} />
          </div>
        );
      case 'Hair':
        return (
          <div className="space-y-4">
            <CustomSelect id="hair_style" label="Hair Style" value={options.hair_style} options={HAIR_STYLE_OPTIONS} onChange={handleChange} disabled={isOutfitSwitchMode} />
            <CustomSelect id="hair_color_main" label="Main Hair Color" value={options.hair_color_main} options={HAIR_COLOR_OPTIONS} onChange={handleChange} disabled={isOutfitSwitchMode} />
            <CustomSelect id="hair_color_secondary" label="Secondary Hair Color (Optional)" value={options.hair_color_secondary} options={['', ...HAIR_COLOR_OPTIONS]} onChange={handleChange} disabled={isOutfitSwitchMode} />
            <CustomSelect id="hair_color_pattern" label="Hair Color Pattern" value={options.hair_color_pattern} options={['solid', 'money_piece', 'streaks', 'ombre', 'front_dark_back_light', 'front_light_back_dark']} onChange={handleChange} disabled={isOutfitSwitchMode} />
          </div>
        );
      case 'Style':
        return (
          <div className="space-y-4">
            <CustomTextArea id="outfit_style_notes" label="Outfit Style Notes" value={options.outfit_style_notes} onChange={handleChange} placeholder="e.g., cozy pink feather robe, lacey white dress with cowboy hat" />
            <CustomSelect id="makeup_style" label="Makeup Style" value={options.makeup_style} options={MAKEUP_STYLE_OPTIONS} onChange={handleChange} disabled={isOutfitSwitchMode} />
            <CustomSelect id="makeup_brand_vibe" label="Makeup Brand Vibe" value={options.makeup_brand_vibe} options={MAKEUP_BRAND_OPTIONS} onChange={handleChange} disabled={isOutfitSwitchMode}/>
            <CustomSelect id="designer_vibe" label="Designer Vibe" value={options.designer_vibe} options={DESIGNER_VIBE_OPTIONS} onChange={handleChange} disabled={isOutfitSwitchMode}/>
          </div>
        );
      case 'Scene':
        return (
          <div className="space-y-4">
            <CustomSelect id="pose" label="Pose" value={options.pose} options={POSE_OPTIONS} onChange={handleChange} disabled={isOutfitSwitchMode}/>
            <CustomSelect id="scene_type" label="Scene Type" value={options.scene_type} options={SCENE_TYPE_OPTIONS} onChange={handleChange} disabled={isOutfitSwitchMode} />
            {options.scene_type === 'holiday_christmas' && (
              <CustomSelect id="christmas_scene" label="Christmas Scene" value={options.christmas_scene} options={['', ...CHRISTMAS_SCENE_OPTIONS]} onChange={handleChange} disabled={isOutfitSwitchMode}/>
            )}
          </div>
        );
      case 'Output':
        return (
            <div className="space-y-4">
                <CustomSelect id="teeth_type" label="Teeth Type" value={options.teeth_type} options={['natural_realistic', 'veneers_glam']} onChange={handleChange} disabled={isOutfitSwitchMode}/>
                <CustomSelect id="image_ratio" label="Image Ratio" value={options.image_ratio} options={['1:1 square', '3:4 vertical', '9:16 vertical', '4:3', '16:9']} onChange={handleChange} disabled={isOutfitSwitchMode} />
                <CustomSelect id="retouch_level" label="Retouch Level" value={options.retouch_level} options={['soft_skin_but_keep_texture', 'full_glam_editorial']} onChange={handleChange} disabled={isOutfitSwitchMode} />
            </div>
        )
      default:
        return null;
    }
  };

  return (
    <div className="mt-4">
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-4 overflow-x-auto" aria-label="Tabs">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`${
                activeTab === tab
                  ? 'border-[#FF4FA3] text-[#D4007F]'
                  : 'border-transparent text-pink-500 hover:text-pink-700 hover:border-pink-300'
              } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>
      <div className="mt-6">
        {renderContent()}
      </div>
    </div>
  );
};