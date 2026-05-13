import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { cn } from '../../lib/utils';
import { useConfig } from '../../hooks/useConfig';

interface EditorProps {
  value: string;
  onChange: (content: string) => void;
  className?: string;
  placeholder?: string;
}

const modules = {
  toolbar: [
    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
    [{ 'color': [] }, { 'background': [] }],
    ['link', 'clean'],
  ],
};

const formats = [
  'header',
  'bold', 'italic', 'underline', 'strike',
  'list',
  'color', 'background',
  'link'
];

export default function Editor({ value, onChange, className, placeholder }: EditorProps) {
  const { config } = useConfig();
  const primaryColor = config.appearance?.primaryColor || '#8B5CF6';
  const borderRadius = config.appearance?.borderRadius || '0.75rem';

  return (
    <div className={cn("rich-text-editor group", className)}>
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        className="bg-card text-foreground overflow-hidden border border-border transition-all duration-300 focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10"
        style={{ borderRadius }}
      />
      <style>{`
        .rich-text-editor .ql-toolbar {
          border-top: none;
          border-left: none;
          border-right: none;
          border-bottom: 1px solid hsl(var(--border));
          background: hsl(var(--muted) / 0.3);
          backdrop-filter: blur(8px);
          padding: 10px 16px;
          position: sticky;
          top: 0;
          z-index: 10;
          transition: all 0.3s ease;
        }
        .rich-text-editor .ql-container {
          border: none !important;
          font-family: inherit;
          font-size: 0.9375rem;
          min-height: 350px;
        }
        .rich-text-editor .ql-editor {
          padding: 24px 32px;
          min-height: 350px;
          line-height: 1.7;
          color: hsl(var(--foreground));
        }
        .rich-text-editor .ql-editor.ql-blank::before {
          color: hsl(var(--muted-foreground) / 0.4);
          font-style: normal;
          left: 32px;
          font-weight: 500;
        }
        
        /* Toolbar Customization */
        .rich-text-editor .ql-snow.ql-toolbar button {
          border-radius: 6px;
          transition: all 0.2s ease;
          margin-right: 4px;
        }
        .rich-text-editor .ql-snow.ql-toolbar button:hover,
        .rich-text-editor .ql-snow.ql-toolbar button.ql-active {
          background: ${primaryColor}15;
        }
        .rich-text-editor .ql-snow.ql-toolbar button:hover .ql-stroke,
        .rich-text-editor .ql-snow.ql-toolbar button.ql-active .ql-stroke {
          stroke: ${primaryColor};
        }
        .rich-text-editor .ql-snow.ql-toolbar button:hover .ql-fill,
        .rich-text-editor .ql-snow.ql-toolbar button.ql-active .ql-fill {
          fill: ${primaryColor};
        }
        
        /* Dropdowns */
        .rich-text-editor .ql-snow .ql-picker {
          color: hsl(var(--foreground));
          font-weight: 600;
        }
        .rich-text-editor .ql-snow .ql-picker-label {
          border: 1px solid transparent;
          border-radius: 6px;
          transition: all 0.2s ease;
        }
        .rich-text-editor .ql-snow .ql-picker-label:hover {
          color: ${primaryColor};
          background: ${primaryColor}10;
        }
        .rich-text-editor .ql-snow .ql-stroke {
          stroke: hsl(var(--foreground));
        }
        .rich-text-editor .ql-snow .ql-picker-options {
          background-color: hsl(var(--card));
          border: 1px solid hsl(var(--border));
          border-radius: 12px;
          box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
          padding: 8px;
        }
        
        /* Links */
        .rich-text-editor .ql-editor a {
          color: ${primaryColor};
          text-decoration: underline;
          text-underline-offset: 4px;
        }
        
        /* Headings */
        .rich-text-editor .ql-editor h1,
        .rich-text-editor .ql-editor h2,
        .rich-text-editor .ql-editor h3 {
          color: hsl(var(--foreground));
          font-weight: 800;
          margin-top: 1.5em;
          margin-bottom: 0.5em;
        }
      `}</style>
    </div>
  );
}
