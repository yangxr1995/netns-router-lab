import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, FileJson, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (json: string) => void;
}

export default function ImportDialog({
  open,
  onOpenChange,
  onImport
}: ImportDialogProps) {
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setJsonText(content);
      setError('');
    };
    reader.readAsText(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImport = () => {
    if (!jsonText.trim()) {
      setError('请输入或选择 JSON 文件');
      return;
    }

    try {
      // Validate JSON
      JSON.parse(jsonText);
      onImport(jsonText);
      setJsonText('');
      setError('');
      onOpenChange(false);
    } catch (err) {
      setError('无效的 JSON 格式: ' + (err as Error).message);
    }
  };

  const handleClose = () => {
    setJsonText('');
    setError('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            导入配置
          </DialogTitle>
          <DialogDescription>
            从 JSON 文件导入网络拓扑配置
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="file" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="file">选择文件</TabsTrigger>
            <TabsTrigger value="paste">粘贴 JSON</TabsTrigger>
          </TabsList>

          <TabsContent value="file" className="space-y-4">
            <div className="flex flex-col items-center justify-center gap-4 p-8 border-2 border-dashed border-border rounded-lg">
              <FileJson className="h-12 w-12 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  选择 rlab JSON 配置文件
                </p>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  选择文件
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </div>
            
            {jsonText && (
              <div className="p-3 bg-secondary/50 rounded text-xs">
                <p className="text-muted-foreground">已选择文件内容 (前 200 字符):</p>
                <code className="block mt-1 text-foreground truncate">
                  {jsonText.slice(0, 200)}...
                </code>
              </div>
            )}
          </TabsContent>

          <TabsContent value="paste" className="space-y-4">
            <Textarea
              value={jsonText}
              onChange={(e) => {
                setJsonText(e.target.value);
                setError('');
              }}
              placeholder={`{\n  "nodes": [\n    {\n      "name": "internet",\n      "nodes": [...]\n    }\n  ]\n}`}
              className="min-h-[200px] font-mono text-xs"
            />
          </TabsContent>
        </Tabs>

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={handleClose}>
            取消
          </Button>
          <Button onClick={handleImport} disabled={!jsonText.trim()}>
            导入
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
