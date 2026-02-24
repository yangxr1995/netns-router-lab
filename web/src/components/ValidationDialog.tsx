import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

interface ValidationResult {
  type: 'error' | 'warning' | 'info';
  message: string;
}

interface ValidationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  results: ValidationResult[];
  isValid: boolean;
}

export default function ValidationDialog({
  open,
  onOpenChange,
  results,
  isValid
}: ValidationDialogProps) {
  const errors = results.filter(r => r.type === 'error');
  const warnings = results.filter(r => r.type === 'warning');
  const infos = results.filter(r => r.type === 'info');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isValid ? (
              <CheckCircle2 className="h-5 w-5 text-green-400" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-400" />
            )}
            拓扑验证结果
          </DialogTitle>
          <DialogDescription>
            {isValid 
              ? '拓扑配置正确，可以导出使用' 
              : '发现一些问题，请检查并修复'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-4 max-h-[300px] overflow-y-auto">
          {errors.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-red-400 uppercase tracking-wider">
                错误 ({errors.length})
              </h4>
              {errors.map((result, idx) => (
                <Alert key={idx} variant="destructive" className="py-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    {result.message}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          )}

          {warnings.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-amber-400 uppercase tracking-wider">
                警告 ({warnings.length})
              </h4>
              {warnings.map((result, idx) => (
                <Alert key={idx} className="py-2 bg-amber-500/10 border-amber-500/30">
                  <AlertCircle className="h-4 w-4 text-amber-400" />
                  <AlertDescription className="text-xs text-amber-200">
                    {result.message}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          )}

          {infos.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-blue-400 uppercase tracking-wider">
                提示 ({infos.length})
              </h4>
              {infos.map((result, idx) => (
                <Alert key={idx} className="py-2 bg-blue-500/10 border-blue-500/30">
                  <Info className="h-4 w-4 text-blue-400" />
                  <AlertDescription className="text-xs text-blue-200">
                    {result.message}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          )}

          {results.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-400" />
              <p>拓扑配置完整，没有发现任何问题</p>
            </div>
          )}
        </div>

        <div className="flex justify-end mt-4">
          <Button onClick={() => onOpenChange(false)}>
            确定
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
