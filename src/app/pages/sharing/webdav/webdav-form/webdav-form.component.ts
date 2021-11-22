import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { TranslateService } from '@ngx-translate/core';
import * as _ from 'lodash';
import { filter } from 'rxjs/operators';
import { ExplorerType } from 'app/enums/explorer-type.enum';
import { ServiceName } from 'app/enums/service-name.enum';
import { helptextSharingWebdav, shared } from 'app/helptext/sharing';
import { FormConfiguration } from 'app/interfaces/entity-form.interface';
import { EntityFormComponent } from 'app/pages/common/entity/entity-form/entity-form.component';
import { FieldConfig } from 'app/pages/common/entity/entity-form/models/field-config.interface';
import { FieldSet } from 'app/pages/common/entity/entity-form/models/fieldset.interface';
import { AppLoaderService, DialogService, WebSocketService } from 'app/services';

@UntilDestroy()
@Component({
  selector: 'app-user-form',
  template: '<entity-form [conf]="this"></entity-form>',
})

export class WebdavFormComponent implements FormConfiguration {
  queryCall = 'sharing.webdav.query' as const;
  queryKey = 'id';
  addCall = 'sharing.webdav.create' as const;
  editCall = 'sharing.webdav.update' as const;
  isEntity = true;
  title: string = this.translate.instant('Add WebDAV');
  confirmSubmit = true;
  confirmSubmitDialog = {
    title: helptextSharingWebdav.warning_dialog_title,
    message: helptextSharingWebdav.warning_dialog_message,
    hideCheckbox: false,
  };

  fieldConfig: FieldConfig[] = [];
  fieldSetDisplay = 'default';
  fieldSets: FieldSet[] = [
    {
      name: helptextSharingWebdav.fieldset_name,
      class: 'webdav-configuration-form',
      label: true,
      config: [
        {
          type: 'input',
          name: 'name',
          placeholder: helptextSharingWebdav.placeholder_name,
          tooltip: helptextSharingWebdav.tooltip_name,
          required: true,
          validation: helptextSharingWebdav.validator_name,
        },
        {
          type: 'input',
          name: 'comment',
          placeholder: helptextSharingWebdav.placeholder_comment,
          tooltip: helptextSharingWebdav.tooltip_comment,
        },
        {
          type: 'explorer',
          initial: '/mnt',
          name: 'path',
          explorerType: ExplorerType.Directory,
          placeholder: helptextSharingWebdav.placeholder_path,
          tooltip: helptextSharingWebdav.tooltip_path,
          required: true,
          validation: helptextSharingWebdav.validator_path,
        },
        {
          type: 'checkbox',
          name: 'ro',
          placeholder: helptextSharingWebdav.placeholder_ro,
          tooltip: helptextSharingWebdav.tooltip_ro,
        },
        {
          type: 'checkbox',
          name: 'perm',
          value: true,
          placeholder: helptextSharingWebdav.placeholder_perm,
          tooltip: helptextSharingWebdav.tooltip_perm,
        },
        {
          type: 'checkbox',
          name: 'enabled',
          value: true,
          placeholder: helptextSharingWebdav.placeholder_enabled,
          tooltip: helptextSharingWebdav.tooltip_enabled,
        },
      ],
    }];

  constructor(
    protected router: Router,
    protected ws: WebSocketService,
    private dialog: DialogService,
    private loader: AppLoaderService,
    private translate: TranslateService,
  ) {}

  afterInit(entityForm: EntityFormComponent): void {
    entityForm.formGroup.controls['perm'].valueChanges.pipe(untilDestroyed(this)).subscribe((value: boolean) => {
      this.confirmSubmit = value;
    });
    this.title = entityForm.isNew ? this.translate.instant('Add WebDAV') : this.translate.instant('Edit WebDAV');
  }

  afterSave(): void {
    this.ws.call('service.query', [[]]).pipe(untilDestroyed(this)).subscribe((res) => {
      const service = _.find(res, { service: ServiceName.WebDav });
      if (service.enable) {
        return;
      }

      this.dialog.confirm({
        title: shared.dialog_title,
        message: shared.dialog_message,
        hideCheckBox: true,
        buttonMsg: shared.dialog_button,
      }).pipe(filter(Boolean), untilDestroyed(this)).subscribe(() => {
        this.loader.open();
        this.ws.call('service.update', [service.id, { enable: true }]).pipe(untilDestroyed(this)).subscribe(() => {
          this.ws.call('service.start', [service.service]).pipe(untilDestroyed(this)).subscribe(() => {
            this.loader.close();
            this.dialog.info(
              this.translate.instant('{service} Service', { service: 'WebDAV' }),
              this.translate.instant('The {service} service has been enabled.', { service: 'WebDAV' }),
              '250px',
              'info',
            ).pipe(untilDestroyed(this)).subscribe(() => {});
          }, (err) => {
            this.loader.close();
            this.dialog.errorReport(err.error, err.reason, err.trace.formatted);
          });
        }, (err) => {
          this.loader.close();
          this.dialog.errorReport(err.error, err.reason, err.trace.formatted);
        });
      });
    });
  }
}
