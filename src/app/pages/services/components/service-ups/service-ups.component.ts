import { ApplicationRef, Component, Injector } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { UpsMode } from 'app/enums/ups-mode.enum';
import helptext from 'app/helptext/services/components/service-ups';
import { Choices } from 'app/interfaces/choices.interface';
import { FormConfiguration } from 'app/interfaces/entity-form.interface';
import { UpsConfigUpdate } from 'app/interfaces/ups-config.interface';
import { EntityFormComponent } from 'app/pages/common/entity/entity-form/entity-form.component';
import { FormComboboxConfig } from 'app/pages/common/entity/entity-form/models/field-config.interface';
import { FieldSet } from 'app/pages/common/entity/entity-form/models/fieldset.interface';
import { RelationAction } from 'app/pages/common/entity/entity-form/models/relation-action.enum';
import { WebSocketService } from 'app/services';

@UntilDestroy()
@Component({
  selector: 'ups-edit',
  template: '<entity-form [conf]="this"></entity-form>',
})
export class ServiceUPSComponent implements FormConfiguration {
  protected upsDriverField: FormComboboxConfig;
  private upsDrivers: Choices = {};
  private upsDriverKey: string;
  protected upsPortField: FormComboboxConfig;
  protected entityForm: EntityFormComponent;

  queryCall = 'ups.config' as const;
  routeSuccess: string[] = ['services'];
  title = helptext.formTitle;

  fieldSets: FieldSet[] = [
    {
      name: helptext.ups_fieldset_general,
      label: true,
      width: '50%',
      config: [
        {
          type: 'input',
          name: 'identifier',
          placeholder: helptext.ups_identifier_placeholder,
          tooltip: helptext.ups_identifier_tooltip,
          required: true,
          validation: helptext.ups_identifier_validation,
        },
        {
          type: 'select',
          name: 'mode',
          placeholder: helptext.ups_mode_placeholder,
          tooltip: helptext.ups_mode_tooltip,
          options: helptext.ups_mode_options,
        },
        {
          type: 'input',
          name: 'remotehost',
          placeholder: helptext.ups_remotehost_placeholder,
          tooltip: helptext.ups_remotehost_tooltip,
          required: true,
          isHidden: true,
          disabled: true,
          validation: helptext.ups_remotehost_validation,
          relation: [
            {
              action: RelationAction.Enable,
              when: [{
                name: 'mode',
                value: 'SLAVE',
              }],
            },
          ],
        },
        {
          type: 'input',
          name: 'remoteport',
          placeholder: helptext.ups_remoteport_placeholder,
          tooltip: helptext.ups_remoteport_tooltip,
          value: helptext.ups_remoteport_value,
          required: true,
          isHidden: true,
          disabled: true,
          validation: helptext.ups_remoteport_validation,
          relation: [
            {
              action: RelationAction.Enable,
              when: [{
                name: 'mode',
                value: 'SLAVE',
              }],
            },
          ],
        },
        {
          type: 'combobox',
          name: 'driver',
          placeholder: helptext.ups_driver_placeholder,
          tooltip: helptext.ups_driver_tooltip,
          required: true,
          options: [],
          validation: helptext.ups_driver_validation,
          isHidden: false,
          enableTextWrapForOptions: true,
          relation: [
            {
              action: RelationAction.Disable,
              when: [{
                name: 'mode',
                value: 'SLAVE',
              }],
            },
          ],
        },
        {
          type: 'combobox',
          name: 'port',
          placeholder: helptext.ups_port_placeholder,
          options: [],
          tooltip: helptext.ups_port_tooltip,
          required: true,
          validation: helptext.ups_port_validation,
          isHidden: false,
        },
      ],
    },
    {
      name: helptext.ups_fieldset_monitor,
      label: true,
      width: '50%',
      config: [
        {
          type: 'input',
          name: 'monuser',
          placeholder: helptext.ups_monuser_placeholder,
          tooltip: helptext.ups_monuser_tooltip,
          required: true,
          validation: helptext.ups_monuser_validation,
        },
        {
          type: 'input',
          name: 'monpwd',
          inputType: 'password',
          togglePw: true,
          placeholder: helptext.ups_monpwd_placeholder,
          tooltip: helptext.ups_monpwd_tooltip,
          validation: helptext.ups_monpwd_validation,
          required: true,
        },
        {
          type: 'textarea',
          name: 'extrausers',
          placeholder: helptext.ups_extrausers_placeholder,
          tooltip: helptext.ups_extrausers_tooltip,
        },
        {
          type: 'checkbox',
          name: 'rmonitor',
          placeholder: helptext.ups_rmonitor_placeholder,
          tooltip: helptext.ups_rmonitor_tooltip,
        },
      ],
    },
    { name: 'divier', divider: true },
    {
      name: helptext.ups_fieldset_shutdown,
      label: true,
      width: '50%',
      config: [
        {
          type: 'select',
          name: 'shutdown',
          placeholder: helptext.ups_shutdown_placeholder,
          tooltip: helptext.ups_shutdown_tooltip,
          options: helptext.ups_shutdown_options,
        },
        {
          type: 'input',
          inputType: 'number',
          name: 'shutdowntimer',
          placeholder: helptext.ups_shutdowntimer_placeholder,
          tooltip: helptext.ups_shutdowntimer_tooltip,
        },
        {
          type: 'input',
          name: 'shutdowncmd',
          placeholder: helptext.ups_shutdowncmd_placeholder,
          tooltip: helptext.ups_shutdowncmd_tooltip,
        },
        {
          type: 'checkbox',
          name: 'powerdown',
          placeholder: helptext.ups_powerdown_placeholder,
          tooltip: helptext.ups_powerdown_tooltip,
        },
      ],
    },
    { name: 'divier', divider: true },
    {
      name: helptext.ups_fieldset_other,
      label: true,
      config: [
        {
          type: 'input',
          inputType: 'number',
          name: 'nocommwarntime',
          placeholder: helptext.ups_nocommwarntime_placeholder,
          tooltip: helptext.ups_nocommwarntime_tooltip,
          value: '300',
        },
        {
          type: 'input',
          inputType: 'number',
          name: 'hostsync',
          placeholder: helptext.ups_hostsync_placeholder,
          tooltip: helptext.ups_hostsync_tooltip,
          value: 15,
        },
        {
          type: 'input',
          name: 'description',
          placeholder: helptext.ups_description_placeholder,
          tooltip: helptext.ups_description_tooltip,
        },
        {
          type: 'textarea',
          name: 'options',
          placeholder: helptext.ups_options_placeholder,
          tooltip: helptext.ups_options_tooltip,
          isHidden: false,
        },
        {
          type: 'textarea',
          name: 'optionsupsd',
          placeholder: helptext.ups_optionsupsd_placeholder,
          tooltip: helptext.ups_optionsupsd_tooltip,
        },
      ],
    },
    { name: 'divider', divider: true },
  ];

  constructor(
    protected router: Router,
    protected route: ActivatedRoute,
    protected ws: WebSocketService,
    protected _injector: Injector,
    protected _appRef: ApplicationRef,
  ) {}

  afterInit(entityForm: EntityFormComponent): void {
    entityForm.submitFunction = (body) => this.ws.call('ups.update', [body]);
    this.entityForm = entityForm;

    const generalSet = this.fieldSets.find((set) => set.name === helptext.ups_fieldset_general);
    this.upsDriverField = generalSet.config.find((config) => config.name === 'driver') as FormComboboxConfig;
    this.upsPortField = generalSet.config.find((config) => config.name === 'port') as FormComboboxConfig;

    this.ws.call('ups.driver_choices').pipe(untilDestroyed(this)).subscribe((res) => {
      this.upsDrivers = res;
      for (const item in res) {
        this.upsDriverField.options.push({ label: res[item], value: res[item] });
      }
    });

    this.ws.call('ups.port_choices').pipe(untilDestroyed(this)).subscribe((res) => {
      res.forEach((port) => {
        this.upsPortField.options.push({ label: port, value: port });
      });
    });

    entityForm.formGroup.controls['driver'].valueChanges.pipe(untilDestroyed(this)).subscribe((res) => {
      this.upsDriverKey = this.getKeyByValue(this.upsDrivers, res);
      if (this.upsDrivers[res]) {
        entityForm.formGroup.controls['driver'].setValue(this.upsDrivers[res]);
      }
    });

    entityForm.formGroup.controls['mode'].valueChanges.pipe(untilDestroyed(this)).subscribe((res: UpsMode) => {
      generalSet.config.find((conf) => conf.name === 'remotehost').isHidden = res === UpsMode.Master;
      generalSet.config.find((conf) => conf.name === 'remoteport').isHidden = res === UpsMode.Master;
      generalSet.config.find((conf) => conf.name === 'driver').isHidden = res === UpsMode.Slave;
    });
  }

  getKeyByValue(object: { [key: string]: unknown }, value: unknown): string {
    return Object.keys(object).find((key) => object[key] === value);
  }

  beforeSubmit(data: UpsConfigUpdate): void {
    data.driver = this.upsDriverKey;
  }
}
