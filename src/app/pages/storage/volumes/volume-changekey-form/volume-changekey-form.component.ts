import {
  Component,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { marker as T } from '@biesbjerg/ngx-translate-extract-marker';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import * as _ from 'lodash';
import helptext from 'app/helptext/storage/volumes/volume-key';
import { FormConfiguration } from 'app/interfaces/entity-form.interface';
import { Pool } from 'app/interfaces/pool.interface';
import { EntityFormComponent } from 'app/pages/common/entity/entity-form/entity-form.component';
import {
  FieldConfig, FormParagraphConfig,
} from 'app/pages/common/entity/entity-form/models/field-config.interface';
import { VolumeChangekeyFormValues } from 'app/pages/storage/volumes/volume-changekey-form/volume-changekey-form-values.interface';
import { WebSocketService } from 'app/services';
import { AppLoaderService } from 'app/services/app-loader/app-loader.service';
import { DialogService } from 'app/services/dialog.service';
import { EncryptionService } from 'app/services/encryption.service';

@UntilDestroy()
@Component({
  selector: 'app-createpassphrase-form',
  template: '<entity-form [conf]="this"></entity-form>',
})
export class VolumeChangekeyFormComponent implements FormConfiguration {
  saveSubmitText = T('Change Passphrase');

  queryCall = 'pool.query' as const;
  queryKey = 'id';
  route_return: string[] = ['storage', 'pools'];
  isNew = false;
  isEntity = true;
  poolName: string;
  admin_pw = '';
  entityData = {
    name: '',
    passphrase: '',
    passphrase2: '',
  };

  fieldConfig: FieldConfig[] = [
    {
      type: 'input',
      name: 'name',
      isHidden: true,
    }, {
      type: 'paragraph',
      name: 'encrypt-headline',
      paraText: '<i class="material-icons">lock</i>' + helptext.changekey2_headline,
    }, {
      type: 'paragraph',
      name: 'changekey-instructions',
      paraText: helptext.changekey_instructions2,
    }, {
      type: 'input',
      inputType: 'password',
      togglePw: true,
      name: 'adminpw',
      placeholder: helptext.changekey_adminpw_placeholder,
      tooltip: helptext.changekey_adminpw_tooltip,
      validation: helptext.changekey_adminpw_validation,
      required: true,
    }, {
      type: 'input',
      inputType: 'password',
      name: 'passphrase',
      placeholder: helptext.changekey_passphrase_placeholder,
      tooltip: helptext.changekey_passphrase_tooltip,
      validation: helptext.changekey_passphrase_validation,
      required: true,
      disabled: false,
      togglePw: true,
    },
    {
      type: 'checkbox',
      name: 'remove_passphrase',
      placeholder: helptext.changekey_remove_passphrase_placeholder,
      tooltip: helptext.changekey_remove_passphrase_tooltip,
    },
  ];

  custActions = [
    {
      id: 'download_encrypt_key',
      name: T('Download Encryption Key'),
      disabled: true,
      function: () => {
        this.ws.call('auth.check_user', ['root', this.admin_pw]).pipe(untilDestroyed(this)).subscribe((res) => {
          if (res) {
            this.encryptionService.openEncryptDialog(this.pk, this.route_return, this.poolName);
          } else {
            this.dialogService.info('Error', 'The administrator password is incorrect.', '340px');
          }
        });
      },
    },
    {
      id: 'custom_cancel',
      name: T('Cancel'),
      function: () => {
        this.router.navigate(new Array('/').concat(
          this.route_return,
        ));
      },
    }];

  resourceTransformIncomingRestData(data: Pool): Pool {
    this.poolName = data.name;
    const config: FormParagraphConfig = _.find(this.fieldConfig, { name: 'encrypt-headline' });
    config.paraText += ` <em>${this.poolName}</em>`;
    return data;
  }

  pk: string;
  constructor(
    protected router: Router,
    protected route: ActivatedRoute,
    protected ws: WebSocketService,
    protected dialogService: DialogService,
    protected loader: AppLoaderService,
    public mdDialog: MatDialog,
    protected encryptionService: EncryptionService,
  ) {

  }

  preInit(): void {
    this.route.params.pipe(untilDestroyed(this)).subscribe((params) => {
      this.pk = params['pk'];
    });
  }

  afterInit(entityForm: EntityFormComponent): void {
    entityForm.formGroup.controls['remove_passphrase'].valueChanges.pipe(untilDestroyed(this)).subscribe((res: boolean) => {
      if (res) {
        entityForm.setDisabled('passphrase', true);
        entityForm.setDisabled('passphrase2', true);
      } else {
        entityForm.setDisabled('passphrase', false);
        entityForm.setDisabled('passphrase2', false);
      }
    });
    entityForm.formGroup.controls['adminpw'].valueChanges.pipe(untilDestroyed(this)).subscribe((res: string) => {
      this.admin_pw = res;
      const btn = document.getElementById('cust_button_Download Encryption Key') as HTMLInputElement;
      btn.disabled = this.admin_pw === '';
    });
  }

  customSubmit(value: VolumeChangekeyFormValues): void {
    let success_msg: string;
    if (value.remove_passphrase) {
      value.passphrase = null;
      (value as any).passphrase2 = null;
      success_msg = 'removed from';
    } else {
      success_msg = 'changed for';
    }

    this.ws.call('auth.check_user', ['root', value.adminpw]).pipe(untilDestroyed(this)).subscribe((res) => {
      if (res) {
        this.encryptionService.setPassphrase(this.pk, value.passphrase, value.adminpw,
          value.name, this.route_return, false, true, success_msg);
      } else {
        this.dialogService.info('Error', 'The administrator password is incorrect.', '340px');
      }
    });
  }
}
