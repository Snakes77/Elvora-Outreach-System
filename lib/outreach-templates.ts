import { SAFTemplates } from './campaigns/saf-5-week/templates';
import { OutreachTemplates } from './campaigns/legacy/templates';
export { formatName, getSignatureHTML } from './campaigns/_shared/utils';

// Backward compatibility bridge for old testing scripts
// The live cron pipelines NO LONGER use this function, they route directly to their boxed templates.
export const getTemplateForPhase = (phase: number, leadId: string, lead: any, bespokeBody?: string | null) => {
    if (lead.campaign_type === '5_week_saf_campaign') {
        switch (phase) {
            case 1: return SAFTemplates.Week1_Safe(lead);
            case 2: return SAFTemplates.Week2_Effective(lead);
            case 3: return SAFTemplates.Week3_Caring(lead);
            case 4: return SAFTemplates.Week4_Responsive(lead);
            case 5: return SAFTemplates.Week5_WellLed(lead);
            default: return null;
        }
    } else {
        switch (phase) {
            case 1: return OutreachTemplates.Week1(lead);
            case 2: return OutreachTemplates.Week2(lead);
            case 3: return OutreachTemplates.Week3(lead);
            case 4: return OutreachTemplates.Week4(lead);
            case 5: return OutreachTemplates.Week5(lead);
            case 6: return OutreachTemplates.Week6(lead);
            case 7: return OutreachTemplates.Week7(lead);
            case 8: return OutreachTemplates.Week8(lead);
            default: return null;
        }
    }
};
