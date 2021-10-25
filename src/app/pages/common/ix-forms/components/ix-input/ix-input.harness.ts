import { BaseHarnessFilters, ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';
import { MatInputHarness } from '@angular/material/input/testing';
import { IxFormControlHarness } from 'app/pages/common/ix-forms/interfaces/ix-form-control-harness.interface';

export interface IxInputHarnessFilters extends BaseHarnessFilters {
  label: string;
}

export class IxInputHarness extends ComponentHarness implements IxFormControlHarness {
  static hostSelector = 'ix-input';

  static with(options: IxInputHarnessFilters): HarnessPredicate<IxInputHarness> {
    return new HarnessPredicate(IxInputHarness, options)
      .addOption('label', options.label,
        (harness, label) => HarnessPredicate.stringMatches(harness.getLabelText(), label));
  }

  getMatInputHarness = this.locatorFor(MatInputHarness);

  async getLabelText(): Promise<string> {
    const label = await this.locatorFor('label')();
    return label.text({ exclude: '.required' });
  }

  async getErrorText(): Promise<string> {
    const label = await this.locatorForOptional('ix-form-errors')();
    return label?.text() || '';
  }

  async getValue(): Promise<string> {
    return (await this.getMatInputHarness()).getValue();
  }

  async setValue(value: string): Promise<void> {
    return (await this.getMatInputHarness()).setValue(value);
  }
}
