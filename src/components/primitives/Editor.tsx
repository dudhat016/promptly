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
    [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }],
    [{ 'align': [] }],
    ['blockquote', 'code-block'],
    [{ 'color': [] }, { 'background': [] }],
    ['link', 'clean'],
  ],
};

const formats = [
  'header',
  'bold', 'italic', 'underline', 'strike',
  'list', 'indent', 'align',
  'blockquote', 'code-block',
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
          font-size: 1rem;
          min-height: 380px;
        }
        
        /* High specificity overrides for Quill Editor content */
        .rich-text-editor .ql-snow .ql-editor {
          padding: 28px 36px !important;
          min-height: 380px !important;
          line-height: 1.75 !important;
          color: hsl(var(--foreground)) !important;
          word-break: normal !important;
          overflow-wrap: break-word !important;
          white-space: pre-wrap !important;
        }
        .rich-text-editor .ql-snow .ql-editor.ql-blank::before {
          color: hsl(var(--muted-foreground) / 0.4);
          font-style: normal;
          left: 36px;
          font-weight: 500;
        }
        
        /* Toolbar Buttons Customization */
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
        .rich-text-editor .ql-snow .ql-fill {
          fill: hsl(var(--foreground));
        }
        .rich-text-editor .ql-snow .ql-picker-options {
          background-color: hsl(var(--card));
          border: 1px solid hsl(var(--border));
          border-radius: 12px;
          box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
          padding: 8px;
        }
        
        /* Links */
        .rich-text-editor .ql-snow .ql-editor a {
          color: ${primaryColor} !important;
          text-decoration: underline !important;
          text-underline-offset: 4px !important;
        }
        
        /* Typography Elements - Matching Frontend Prose */
        .rich-text-editor .ql-snow .ql-editor h1 {
          font-size: 2.25rem !important;
          font-weight: 800 !important;
          line-height: 1.25 !important;
          margin-top: 2rem !important;
          margin-bottom: 1rem !important;
          color: hsl(var(--foreground)) !important;
          letter-spacing: -0.025em !important;
        }
        .rich-text-editor .ql-snow .ql-editor h2 {
          font-size: 1.625rem !important;
          font-weight: 700 !important;
          line-height: 1.35 !important;
          margin-top: 1.75rem !important;
          margin-bottom: 0.75rem !important;
          color: hsl(var(--foreground)) !important;
          letter-spacing: -0.02em !important;
        }
        .rich-text-editor .ql-snow .ql-editor h3 {
          font-size: 1.35rem !important;
          font-weight: 600 !important;
          line-height: 1.4 !important;
          margin-top: 1.5rem !important;
          margin-bottom: 0.5rem !important;
          color: hsl(var(--foreground)) !important;
        }
        .rich-text-editor .ql-snow .ql-editor h4 {
          font-size: 1.15rem !important;
          font-weight: 600 !important;
          margin-top: 1.25rem !important;
          margin-bottom: 0.5rem !important;
          color: hsl(var(--foreground)) !important;
        }
        .rich-text-editor .ql-snow .ql-editor p {
          font-size: 1rem !important;
          line-height: 1.75 !important;
          margin-bottom: 1.25rem !important;
          color: hsl(var(--foreground) / 0.9) !important;
        }
        .rich-text-editor .ql-snow .ql-editor blockquote {
          border-left: 4px solid ${primaryColor} !important;
          padding: 0.75rem 1.25rem !important;
          margin: 1.5rem 0 !important;
          font-style: italic !important;
          color: hsl(var(--muted-foreground)) !important;
          background: hsl(var(--muted) / 0.25) !important;
          border-radius: 0 10px 10px 0 !important;
        }
        .rich-text-editor .ql-snow .ql-editor pre.ql-syntax {
          background-color: hsl(var(--muted) / 0.5) !important;
          color: hsl(var(--foreground)) !important;
          border-radius: 8px !important;
          padding: 1rem !important;
          font-family: monospace !important;
          font-size: 0.875rem !important;
          margin: 1.25rem 0 !important;
        }
        .rich-text-editor .ql-snow .ql-editor ul,
        .rich-text-editor .ql-snow .ql-editor ol {
          padding-left: 1.75rem !important;
          margin-bottom: 1.25rem !important;
        }
        .rich-text-editor .ql-snow .ql-editor li {
          margin-bottom: 0.35rem !important;
          line-height: 1.7 !important;
        }
      `}</style>
    </div>
  );
}
