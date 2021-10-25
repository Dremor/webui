import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { MarkdownModule } from 'ngx-markdown';
import { MaterialModule } from 'app/app-material.module';
import { CommonDirectivesModule } from 'app/directives/common/common-directives.module';
import { TooltipModule } from 'app/modules/tooltip/tooltip.module';
import { IxCheckboxComponent } from 'app/pages/common/ix-forms/components/ix-checkbox/ix-checkbox.component';
import { IxComboboxComponent } from 'app/pages/common/ix-forms/components/ix-combobox/ix-combobox.component';
import { IxFieldsetComponent } from 'app/pages/common/ix-forms/components/ix-fieldset/ix-fieldset.component';
import { IxFormErrorsComponent } from 'app/pages/common/ix-forms/components/ix-form-errors/ix-form-errors.component';
import { IxInputComponent } from 'app/pages/common/ix-forms/components/ix-input/ix-input.component';
import { IxModalComponent } from 'app/pages/common/ix-forms/components/ix-modal/ix-modal.component';
import { IxModalDirective } from 'app/pages/common/ix-forms/components/ix-modal/ix-modal.directive';
import { IxSelectComponent } from 'app/pages/common/ix-forms/components/ix-select/ix-select.component';
import { IxTextareaComponent } from 'app/pages/common/ix-forms/components/ix-textarea/ix-textarea.component';
import { IxUserComboboxComponent } from 'app/pages/common/ix-forms/components/ix-user-combobox/ix-user-combobox.component';
import { EnclosureModule } from 'app/pages/system/view-enclosure/enclosure.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MaterialModule,
    MarkdownModule.forRoot(),
    FlexLayoutModule,
    EnclosureModule,
    CommonDirectivesModule,
    TooltipModule,
    TranslateModule,
  ],
  declarations: [
    IxInputComponent,
    IxSelectComponent,
    IxComboboxComponent,
    IxFieldsetComponent,
    IxModalComponent,
    IxModalDirective,
    IxCheckboxComponent,
    IxFormErrorsComponent,
    IxUserComboboxComponent,
    IxTextareaComponent,
  ],
  exports: [
    IxInputComponent,
    IxSelectComponent,
    IxComboboxComponent,
    IxModalComponent,
    IxFieldsetComponent,
    IxModalDirective,
    IxUserComboboxComponent,
    IxCheckboxComponent,
    IxFormErrorsComponent,
    IxTextareaComponent,
  ],
})
export class IxFormsModule {}
