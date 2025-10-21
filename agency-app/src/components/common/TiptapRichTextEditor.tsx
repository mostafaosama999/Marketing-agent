// src/components/common/TiptapRichTextEditor.tsx
import React from 'react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import {
  RichTextEditor,
  MenuControlsContainer,
  MenuSelectHeading,
  MenuDivider,
  MenuButtonBold,
  MenuButtonItalic,
  MenuButtonUnderline,
  MenuButtonBulletedList,
  MenuButtonOrderedList,
  MenuButtonBlockquote,
  MenuButtonUndo,
  MenuButtonRedo,
  type RichTextEditorRef,
} from 'mui-tiptap';
import { Box } from '@mui/material';

interface TiptapRichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: number;
}

const TiptapRichTextEditor: React.FC<TiptapRichTextEditorProps> = ({
  value,
  onChange,
  placeholder = "Start typing...",
  height = 200,
}) => {
  const rteRef = React.useRef<RichTextEditorRef>(null);

  // Handle content changes
  const handleContentChange = React.useCallback((newContent: string) => {
    onChange(newContent);
  }, [onChange]);

  return (
    <Box sx={{ '& .ProseMirror': { outline: 'none' } }}>
      <RichTextEditor
        ref={rteRef}
        content={value}
        extensions={[
          StarterKit.configure({
            // Configure the included extensions
            heading: {
              levels: [1, 2, 3, 4],
            },
            bulletList: {
              keepMarks: true,
              keepAttributes: false,
            },
            orderedList: {
              keepMarks: true,
              keepAttributes: false,
            },
          }),
          Placeholder.configure({
            placeholder,
            emptyEditorClass: 'is-editor-empty',
          }),
        ]}
        onUpdate={({ editor }) => {
          handleContentChange(editor.getHTML());
        }}
        renderControls={() => (
          <MenuControlsContainer>
            <MenuSelectHeading />
            <MenuDivider />
            <MenuButtonBold />
            <MenuButtonItalic />
            <MenuButtonUnderline />
            <MenuDivider />
            <MenuButtonBulletedList />
            <MenuButtonOrderedList />
            <MenuButtonBlockquote />
            <MenuDivider />
            <MenuButtonUndo />
            <MenuButtonRedo />
          </MenuControlsContainer>
        )}
        RichTextFieldProps={{
          variant: "outlined",
          sx: {
            '& .MuiOutlinedInput-root': {
              padding: 0,
            },
            '& .MuiInputBase-input': {
              padding: 0,
            },
            '& .ProseMirror': {
              minHeight: height,
              padding: '16px',
              fontSize: '14px',
              lineHeight: '1.6',
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              color: '#333',
              outline: 'none',
              '& p.is-editor-empty:first-child::before': {
                color: '#999',
                content: 'attr(data-placeholder)',
                float: 'left',
                height: 0,
                pointerEvents: 'none',
                fontStyle: 'italic',
              },
              '& h1': {
                fontSize: '24px',
                fontWeight: 700,
                margin: '16px 0 8px 0',
                lineHeight: 1.3,
              },
              '& h2': {
                fontSize: '20px',
                fontWeight: 600,
                margin: '14px 0 6px 0',
                lineHeight: 1.3,
              },
              '& h3': {
                fontSize: '18px',
                fontWeight: 600,
                margin: '12px 0 6px 0',
                lineHeight: 1.3,
              },
              '& h4': {
                fontSize: '16px',
                fontWeight: 600,
                margin: '10px 0 4px 0',
                lineHeight: 1.3,
              },
              '& p': {
                margin: '8px 0',
                lineHeight: 1.6,
              },
              '& ul, & ol': {
                margin: '12px 0',
                paddingLeft: '24px',
              },
              '& li': {
                margin: '4px 0',
                lineHeight: 1.5,
              },
              '& blockquote': {
                borderLeft: '4px solid #e0e0e0',
                padding: '12px 16px',
                margin: '16px 0',
                fontStyle: 'italic',
                color: '#666',
                background: '#f9f9f9',
                borderRadius: '0 4px 4px 0',
              },
              '& strong': {
                fontWeight: 600,
              },
            },
          },
        }}
      />
    </Box>
  );
};

export default TiptapRichTextEditor;