import { Injectable } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import * as _ from 'lodash';
import { CoreService } from 'app/core/services/core-service/core.service';
import { ApiDirectory, ApiMethod } from 'app/interfaces/api-directory.interface';
import { Dataset, ExtraDatasetQueryOptions } from 'app/interfaces/dataset.interface';
import { Enclosure } from 'app/interfaces/enclosure.interface';
import { CoreEvent } from 'app/interfaces/events';
import { NetworkInterface } from 'app/interfaces/network-interface.interface';
import { Pool } from 'app/interfaces/pool.interface';
import { QueryParams } from 'app/interfaces/query-api.interface';
import { ReportingGraph } from 'app/interfaces/reporting-graph.interface';
import { Disk } from 'app/interfaces/storage.interface';
import { User } from 'app/interfaces/user.interface';
import { WebSocketService } from 'app/services/ws.service';

export interface ApiCall {
  namespace: ApiMethod; // namespace for ws and path for rest
  args?: any;
  responseEvent?: string;// The event name of the response this service will send
  errorResponseEvent?: string;// The event name of the response this service will send in case it fails
}

interface ApiDefinition {
  apiCall: ApiCall;
  preProcessor?: (def: ApiCall) => ApiCall;
  postProcessor?: (res: unknown, callArgs: unknown, core: CoreService) => unknown;
}

@UntilDestroy()
@Injectable()
export class ApiService {
  private apiDefinitions: { [eventName: string]: ApiDefinition } = {
    UserAttributesRequest: {
      apiCall: {
        namespace: 'user.query',
        args: [] as QueryParams<User>[],
        responseEvent: 'UserAttributes',
      },
      preProcessor(def: ApiCall) {
        const clone = { ...def };
        clone.args = [[['id', '=', 1]]];
        return clone;
      },
      postProcessor(res: User[]) {
        const cloneRes = { ...res };
        return cloneRes[0].attributes;
      },
    },
    UserDataRequest: {
      apiCall: {
        namespace: 'user.query',
        args: [] as QueryParams<User>[],
        responseEvent: 'UserData',
      },
    },
    UserDataUpdate: {
      apiCall: {
        namespace: 'user.set_attribute',
        args: [] as any[],
      },
      preProcessor(def: ApiCall) {
        const uid = 1;
        const redef = { ...def };
        redef.args = [uid, 'preferences', def.args];
        return redef;
      },
      postProcessor(res: any, callArgs: any, core: CoreService) {
        const cloneRes = { ...res };
        if (res == 1) {
          core.emit({ name: 'UserDataRequest', data: [[['id', '=', 1]]] });
        }
        return cloneRes;
      },
    },
    VolumeDataRequest: {
      apiCall: {
        namespace: 'pool.dataset.query',
        args: [[], { extra: { retrieve_children: false } }] as QueryParams<Dataset, ExtraDatasetQueryOptions>,
        responseEvent: 'VolumeData',
      },
    },
    DisksRequest: {
      apiCall: {
        args: [] as QueryParams<Disk>[],
        namespace: 'disk.query',
        responseEvent: 'DisksData',
      },
    },
    EnclosureDataRequest: {
      apiCall: {
        namespace: 'enclosure.query',
        responseEvent: 'EnclosureData',
      },
    },
    SetEnclosureLabel: {
      apiCall: {
        namespace: 'enclosure.update',
        responseEvent: 'EnclosureLabelChanged',
      },
      preProcessor(def: ApiCall) {
        const redef = { ...def };
        const args = [def.args.id, { label: def.args.label }];
        redef.args = args;
        return redef;
      },
      postProcessor(res: Enclosure, callArgs: { index: number }) {
        return { label: res.label, index: callArgs.index, id: res.id };
      },
    },
    SetEnclosureSlotStatus: {
      apiCall: {
        args: [] as unknown as ApiDirectory['enclosure.set_slot_status']['params'],
        namespace: 'enclosure.set_slot_status',
        responseEvent: 'EnclosureSlotStatusChanged',
      },
    },
    PoolDataRequest: {
      apiCall: {
        args: [] as QueryParams<Pool>[],
        namespace: 'pool.query',
        responseEvent: 'PoolData',
      },
    },
    PoolDisksRequest: {
      apiCall: {
        namespace: 'pool.get_disks',
        args: [] as string[],
        responseEvent: 'PoolDisks',
      },
      preProcessor(def: ApiCall) {
        const redef = { ...def };
        redef.responseEvent = def.args.length > 0 ? def.responseEvent + def.args.join() : def.responseEvent;
        return redef;
      },
      postProcessor(res: any, callArgs: any) {
        let cloneRes = { ...res };
        cloneRes = { callArgs, data: res };
        return cloneRes;
      },
    },
    NicInfoRequest: {
      apiCall: {
        namespace: 'interface.query',
        args: [] as QueryParams<NetworkInterface>[],
        responseEvent: 'NicInfo',
      },
    },
    UpdateCheck: {
      apiCall: {
        namespace: 'update.check_available',
        responseEvent: 'UpdateChecked',
      },
    },
    ReportingGraphsRequest: {
      apiCall: {
        namespace: 'reporting.graphs',
        args: [] as QueryParams<ReportingGraph>,
        responseEvent: 'ReportingGraphs',
      },
    },
    SensorDataRequest: {
      apiCall: {
        namespace: 'sensor.query',
        responseEvent: 'SensorData',
      },
    },
  };

  constructor(
    protected core: CoreService,
    protected ws: WebSocketService,
  ) {
    this.ws.authStatus.pipe(untilDestroyed(this)).subscribe((evt) => {
      this.core.emit({ name: 'UserDataRequest', data: [[['id', '=', 1]]] });
      this.core.emit({ name: 'Authenticated', data: evt, sender: this });
    });
    this.registerDefinitions();
  }

  registerDefinitions(): void {
    for (const def in this.apiDefinitions) {
      this.core.register({ observerClass: this, eventName: def }).pipe(untilDestroyed(this)).subscribe(
        (evt: CoreEvent) => {
          // Process Event if CoreEvent is in the api definitions list
          // TODO: Proper type:
          const name = evt.name as keyof ApiService['apiDefinitions'];
          if (this.apiDefinitions[name]) {
            const apiDef = this.apiDefinitions[name];
            this.callWebsocket(evt, apiDef);
          }
        },
        () => {},
      );
    }
  }

  callWebsocket(evt: CoreEvent, def: ApiDefinition): void {
    const cloneDef = _.cloneDeep(def);
    const asyncCalls = [
      'vm.start',
      'vm.delete',
    ];

    if (evt.data) {
      cloneDef.apiCall.args = evt.data;

      if (cloneDef.preProcessor && !asyncCalls.includes(cloneDef.apiCall.namespace)) {
        cloneDef.apiCall = cloneDef.preProcessor(cloneDef.apiCall);
      }

      // PreProcessor: ApiDefinition manipulates call to be sent out.
      if (cloneDef.preProcessor && asyncCalls.includes(cloneDef.apiCall.namespace)) {
        cloneDef.apiCall = cloneDef.preProcessor(cloneDef.apiCall);
        if (!cloneDef.apiCall) {
          this.core.emit({ name: 'VmStopped', data: { id: evt.data[0] } });
          return;
        }
      }

      const call = cloneDef.apiCall;
      this.ws.call(call.namespace, call.args).pipe(untilDestroyed(this)).subscribe((res) => {
        // PostProcess
        if (cloneDef.postProcessor) {
          res = cloneDef.postProcessor(res, evt.data, this.core);
        }
        if (call.responseEvent) {
          this.core.emit({ name: call.responseEvent, data: res, sender: this });
        }
      },
      (error) => {
        error.id = call.args;
        if (call.errorResponseEvent) {
          this.core.emit({ name: call.errorResponseEvent, data: error, sender: this });
        }
        this.core.emit({ name: call.responseEvent, data: error, sender: this });
      });
    } else {
      // PreProcessor: ApiDefinition manipulates call to be sent out.
      if (cloneDef.preProcessor) {
        cloneDef.apiCall = cloneDef.preProcessor(cloneDef.apiCall);
      }

      const call = cloneDef.apiCall;
      this.ws.call(call.namespace, call.args || []).pipe(untilDestroyed(this)).subscribe((res) => {
        // PostProcess
        if (cloneDef.postProcessor) {
          res = cloneDef.postProcessor(res, evt.data, this.core);
        }

        if (call.responseEvent) {
          this.core.emit({ name: call.responseEvent, data: res, sender: this });
        }
      }, (error) => {
        console.error(error);
      });
    }
  }
}
