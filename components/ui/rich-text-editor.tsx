"use client"

import { useEffect, useRef, useState } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import TextAlign from "@tiptap/extension-text-align"
import Image from "@tiptap/extension-image"
import { Bold as BoldIcon, Italic, Underline, List, ListOrdered, AlignLeft, AlignCenter, AlignRight, Image as ImageIcon, Loader2 } from "lucide-react"
import { Button } from "./button"
import { cn } from "@/lib/utils"
import { uploadRichTextImage } from "@/lib/api"

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Image.configure({
        inline: false,
        allowBase64: false,
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[120px] px-3 py-2 [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:border [&_img]:border-border",
      },
    },
  })

  // Sincroniza o conteúdo quando o value muda externamente
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value)
    }
  }, [value, editor])

  if (!editor) {
    return null
  }

  const ToolbarButton = ({
    onClick,
    active,
    children,
    disabled,
  }: {
    onClick: () => void
    active?: boolean
    children: React.ReactNode
    disabled?: boolean
  }) => (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "h-8 w-8 p-0",
        active && "bg-muted",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      {children}
    </Button>
  )

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !editor) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione apenas arquivos de imagem.')
      return
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 10MB.')
      return
    }

    setIsUploading(true)
    try {
      const { url } = await uploadRichTextImage(file)
      editor.chain().focus().setImage({ src: url }).run()
    } catch (error) {
      console.error('Error uploading image:', error)
      alert('Erro ao fazer upload da imagem. Tente novamente.')
    } finally {
      setIsUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const triggerImageUpload = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className={cn("rounded-lg border border-border bg-card", className)}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-border px-2 py-1.5">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
        >
          <BoldIcon className="h-4 w-4" strokeWidth={2} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
        >
          <Italic className="h-4 w-4" strokeWidth={2} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive("underline")}
        >
          <Underline className="h-4 w-4" strokeWidth={2} />
        </ToolbarButton>
        <div className="w-px h-4 bg-border mx-1" />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
        >
          <List className="h-4 w-4" strokeWidth={2} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
        >
          <ListOrdered className="h-4 w-4" strokeWidth={2} />
        </ToolbarButton>
        <div className="w-px h-4 bg-border mx-1" />
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          active={editor.isActive({ textAlign: "left" })}
        >
          <AlignLeft className="h-4 w-4" strokeWidth={2} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          active={editor.isActive({ textAlign: "center" })}
        >
          <AlignCenter className="h-4 w-4" strokeWidth={2} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          active={editor.isActive({ textAlign: "right" })}
        >
          <AlignRight className="h-4 w-4" strokeWidth={2} />
        </ToolbarButton>
        <div className="w-px h-4 bg-border mx-1" />
        <ToolbarButton
          onClick={triggerImageUpload}
          disabled={isUploading}
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
          ) : (
            <ImageIcon className="h-4 w-4" strokeWidth={2} />
          )}
        </ToolbarButton>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
      </div>

      {/* Editor */}
      <EditorContent 
        editor={editor} 
        className="min-h-[120px]"
      />
    </div>
  )
}
