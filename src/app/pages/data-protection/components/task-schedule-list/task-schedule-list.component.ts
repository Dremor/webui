import {
  Component, Input, OnChanges, OnInit,
} from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import { EntityTableComponent } from 'app/pages/common/entity/entity-table/entity-table.component';
import { TaskService } from 'app/services';

@UntilDestroy()
@Component({
  selector: 'app-task-schedule-list',
  templateUrl: './task-schedule-list.component.html',
})
export class TaskScheduleListComponent implements OnInit, OnChanges {
  private static readonly LIST_LENGTH = 5;
  @Input() value: string;
  @Input() config: { schedule?: string; cron_schedule?: string; cron?: string; scrub_schedule?: string };
  @Input() parent: EntityTableComponent;

  futureRuns: string[];

  constructor(private taskService: TaskService) {}

  ngOnInit(): void {
    this.buildFutureRuns();
  }

  ngOnChanges(): void {
    this.buildFutureRuns();
  }

  private buildFutureRuns(): void {
    const scheduleExpression = this.config.cron_schedule
      || this.config.cron
      || this.config.scrub_schedule
      || this.config.schedule;

    if (scheduleExpression !== 'Disabled') {
      this.futureRuns = this.taskService
        .getTaskNextRuns(scheduleExpression, TaskScheduleListComponent.LIST_LENGTH)
        .map((run) => run.toLocaleString());
    }
  }
}
