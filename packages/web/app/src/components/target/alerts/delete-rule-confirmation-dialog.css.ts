import { style } from '@vanilla-extract/css';
import * as shared from '../../../styles/shared.css';

export const deleteRuleConfirmationDialogStyles = {
  ruleName: style([shared.weight.medium, shared.fg.strong]),
};
