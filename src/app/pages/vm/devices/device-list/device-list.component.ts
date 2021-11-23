import { Component, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { TranslateService } from '@ngx-translate/core';
import * as _ from 'lodash';
import { filter } from 'rxjs/operators';
import { QueryFilter } from 'app/interfaces/query-api.interface';
import { VmDevice } from 'app/interfaces/vm-device.interface';
import { DialogFormConfiguration } from 'app/pages/common/entity/entity-dialog/dialog-form-configuration.interface';
import { EntityDialogComponent } from 'app/pages/common/entity/entity-dialog/entity-dialog.component';
import {
  EntityTableComponent,
} from 'app/pages/common/entity/entity-table/entity-table.component';
import { EntityTableAction, EntityTableConfig } from 'app/pages/common/entity/entity-table/entity-table.interface';
import { EntityUtils } from 'app/pages/common/entity/utils';
import { WebSocketService } from 'app/services';
import { AppLoaderService } from 'app/services/app-loader/app-loader.service';
import { DialogService } from 'app/services/dialog.service';

@UntilDestroy()
@Component({
  selector: 'app-device-list',
  template: `
    <entity-table [title]="title" [conf]="this"></entity-table>
  `,
})
export class DeviceListComponent implements EntityTableConfig {
  resourceName: string;
  routeAdd: string[];
  routeEdit: string[];
  protected routeDelete: string[];
  protected pk: string;
  vm: string;
  private entityList: EntityTableComponent;
  wsDelete = 'vm.device.delete' as const;
  queryCall = 'vm.device.query' as const;
  queryCallOption: [[Partial<QueryFilter<VmDevice>>]] = [[['vm', '=']]];
  protected loaderOpen = false;
  columns = [
    { name: this.translate.instant('Device ID'), prop: 'id', always_display: true },
    { name: this.translate.instant('Device'), prop: 'dtype' },
    { name: this.translate.instant('Order'), prop: 'order' },
  ];
  rowIdentifier = 'id';
  title: string;
  config = {
    paging: true,
    sorting: { columns: this.columns },
  };

  globalConfig = {
    id: 'config',
    tooltip: this.translate.instant('Close (return to VM list)'),
    icon: 'highlight_off',
    onClick: () => {
      this.router.navigate(['/', 'vm']);
    },
  };

  constructor(
    protected router: Router,
    protected aroute: ActivatedRoute,
    protected ws: WebSocketService,
    protected loader: AppLoaderService,
    public dialogService: DialogService,
    private cdRef: ChangeDetectorRef,
    private translate: TranslateService,
  ) {}

  isActionVisible(actionId: string, row: VmDevice): boolean {
    return !(actionId === 'delete' && (row as any).id === true);
  }

  getActions(row: VmDevice): EntityTableAction<VmDevice>[] {
    const actions = [];
    actions.push({
      id: row.id,
      name: 'edit',
      icon: 'edit',
      label: this.translate.instant('Edit'),
      onClick: (device: VmDevice) => {
        this.router.navigate(['/', 'vm', this.pk, 'devices', this.vm, 'edit', String(device.id), device.dtype]);
      },
    });
    actions.push({
      id: row.id,
      name: 'delete',
      icon: 'delete',
      label: this.translate.instant('Delete'),
      onClick: (device: VmDevice) => {
        this.deviceDelete(device);
      },
    });
    actions.push({
      id: row.id,
      name: 'reorder',
      icon: 'reorder',
      label: this.translate.instant('Change Device Order'),
      onClick: (row1: VmDevice) => {
        const conf: DialogFormConfiguration = {
          title: this.translate.instant('Change Device Order'),
          message: this.translate.instant('Change order for <b>{vmDevice}</b>', { vmDevice: `${row1.dtype} ${row1.id}` }),
          parent: this,
          fieldConfig: [{
            type: 'input',
            name: 'order',
          },
          ],
          saveButtonText: this.translate.instant('Save'),
          preInit(entityDialog: EntityDialogComponent) {
            _.find(entityDialog.fieldConfig, { name: 'order' })['value'] = row1.order;
          },
          customSubmit: (entityDialog: EntityDialogComponent) => {
            const value = entityDialog.formValue;
            this.loader.open();
            this.ws.call('vm.device.update', [row1.id, { order: value.order }]).pipe(untilDestroyed(this)).subscribe(() => {
              entityDialog.dialogRef.close(true);
              this.loader.close();
              this.entityList.getData();
            }, () => {
              this.loader.close();
            }, () => {
              entityDialog.dialogRef.close(true);
              this.loader.close();
              this.entityList.getData();
            });
          },
        };
        this.dialogService.dialogForm(conf);
      },
    });
    actions.push({
      id: row.id,
      name: 'details',
      icon: 'list',
      label: this.translate.instant('Details'),
      onClick: (device: VmDevice) => {
        let details = '';
        Object.entries(device.attributes).forEach(([attribute, attributeValue]) => {
          details = `${attribute}: ${attributeValue} \n` + details;
        });
        this.dialogService.info(
          this.translate.instant('Change order for <b>{vmDevice}</b>', { vmDevice: `${row.dtype} ${row.id}` }),
          details,
          '500px',
          'info',
        );
      },
    });
    return actions as EntityTableAction[];
  }

  deviceDelete(row: VmDevice): void {
    this.dialogService.confirm({
      title: this.translate.instant('Delete'),
      message: this.translate.instant('Delete <b>{vmDevice}</b>', { vmDevice: `${row.dtype} ${row.id}` }),
      hideCheckBox: true,
      buttonMsg: this.translate.instant('Delete Device'),
    }).pipe(filter(Boolean), untilDestroyed(this)).subscribe(() => {
      this.loader.open();
      this.loaderOpen = true;
      this.ws.call(this.wsDelete, [row.id]).pipe(untilDestroyed(this)).subscribe(
        () => {
          this.entityList.getData();
          this.loader.close();
        },
        (resinner) => {
          new EntityUtils().handleError(this, resinner);
          this.loader.close();
        },
      );
    });
  }

  preInit(entityList: EntityTableComponent): void {
    this.entityList = entityList;
    this.aroute.params.pipe(untilDestroyed(this)).subscribe((params) => {
      this.pk = params['pk'];
      this.vm = params['name'];
      this.routeAdd = ['vm', this.pk, 'devices', this.vm, 'add'];
      this.routeEdit = ['vm', this.pk, 'devices', this.vm, 'edit'];
      this.routeDelete = ['vm', this.pk, 'devices', this.vm, 'delete'];
      // this is filter by vm's id to show devices belonging to that VM
      this.resourceName = 'vm/device/?vm__id=' + this.pk;
      this.title = this.translate.instant('VM {vm} devices', { vm: this.vm });
      this.cdRef.detectChanges();
      this.queryCallOption[0][0].push(parseInt(this.pk, 10));
    });
  }
}
