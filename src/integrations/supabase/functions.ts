// Add this to your existing functions.ts file

export const analyzePrintFailure = async (printerId: string): Promise<{
  is_failure: boolean;
  confidence: number;
  failure_type?: string;
  screenshot_url?: string;
  requires_action: boolean;
}> => {
  const { data, error } = await supabase.functions.invoke("analyze-print-failure", {
    body: { printer_id: printerId },
  });

  if (error) {
    const response = await error.context.json();
    throw new Error(response.error || `AI Analysis Error: ${error.message}`);
  }
  
  if (data.error) {
    throw new Error(data.error);
  }

  return data;
};