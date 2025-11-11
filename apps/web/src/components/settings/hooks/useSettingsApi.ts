import { userApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface SaveSettingsParams {
  [key: string]: any;
}

export function useSettingsApi(
  setLoading: (loading: boolean) => void,
  toast: ReturnType<typeof useToast>['toast']
) {
  const saveSettings = async (
    params: SaveSettingsParams,
    successMessage: string = "Settings saved successfully"
  ) => {
    setLoading(true);
    try {
      await userApi.updatePreferences(params);
      toast({
        title: "Success",
        description: successMessage,
      });
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return { saveSettings };
}