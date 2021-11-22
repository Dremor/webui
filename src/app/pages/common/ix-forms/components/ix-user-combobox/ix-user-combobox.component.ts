import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component, ElementRef, forwardRef, Input, OnInit, ViewChild,
} from '@angular/core';
import {
  ControlValueAccessor, FormControl, NgControl, NG_VALUE_ACCESSOR,
} from '@angular/forms';
import { MatAutocomplete, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { TranslateService } from '@ngx-translate/core';
import {
  fromEvent, Observable, of, Subject, zip,
} from 'rxjs';
import {
  debounceTime, distinctUntilChanged, map, takeUntil,
} from 'rxjs/operators';
import { Option } from 'app/interfaces/option.interface';
import { User } from 'app/interfaces/user.interface';
import { UserService } from 'app/services';

@UntilDestroy()
@Component({
  selector: 'ix-user-combobox',
  templateUrl: './ix-user-combobox.component.html',
  styleUrls: ['./ix-user-combobox.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => IxUserComboboxComponent),
      multi: true,
    },
  ],
})
export class IxUserComboboxComponent implements ControlValueAccessor, OnInit {
  @Input() label: string;
  @Input() hint: string;
  @Input() required: boolean;
  @Input() tooltip: string;
  @ViewChild('ixInput') inputElementRef: ElementRef;
  @ViewChild('auto') autoCompleteRef: MatAutocomplete;
  @ViewChild(MatAutocompleteTrigger) autocompleteTrigger: MatAutocompleteTrigger;
  placeholder = this.translate.instant('Search');
  getDisplayWith = this.displayWith.bind(this);
  isDisabled = false;

  filter: (options: Option[], filterValue: string) => Observable<Option[]> =
  (options: Option[], value: string): Observable<Option[]> => {
    const filtered = options.filter((option: Option) => {
      return option.label.toLowerCase().includes(value.toLowerCase())
          || option.value.toString().toLowerCase().includes(value.toLowerCase());
    });
    return of(filtered);
  };

  filteredOptions: Observable<Option[]>;
  filterChanged$ = new Subject<string>();
  formControl = new FormControl(this);
  value: string | number = '';
  filterValue = '';
  touched = false;
  selectedOption: Option = null;
  syncOptions: Option[];
  options: Observable<Option[]>;
  currentOffset = 0;

  onChange: (value: string | number) => void = (): void => {};
  onTouch: () => void = (): void => {};
  userQueryResToOptions: (users: User[]) => Option[] = (users): Option[] => users.map((user) => {
    return { label: user.username, value: user.username };
  });

  constructor(
    public controlDirective: NgControl,
    private cdr: ChangeDetectorRef,
    private userService: UserService,
    private translate: TranslateService,
  ) {
    this.controlDirective.valueAccessor = this;
  }

  writeValue(value: string | number): void {
    this.value = value;
    if (this.value && this.syncOptions) {
      this.selectedOption = { ...(this.syncOptions.find((option: Option) => option.value === this.value)) };
    }
    if (this.selectedOption) {
      this.currentOffset = 0;
      this.filterChanged$.next('');
    }

    this.cdr.markForCheck();
  }

  ngOnInit(): void {
    this.filterChanged$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      untilDestroyed(this),
    ).subscribe((changedValue: string) => {
      this.filterValue = changedValue;
      this.currentOffset = 0;
      this.loadMoreUsers(this.filterValue, this.currentOffset);

      this.cdr.markForCheck();
    });

    this.userService.userQueryDsCache().pipe(
      map(this.userQueryResToOptions),
      untilDestroyed(this),
    ).subscribe((options: Option[]) => {
      this.syncOptions = options;
      this.filteredOptions = of(options);
      const setOption = this.syncOptions.find((option: Option) => option.value === this.value);
      this.selectedOption = setOption ? { ...setOption } : null;
      if (this.selectedOption) {
        this.currentOffset = 0;
        this.filterChanged$.next('');
      }
    });
  }

  onOpenDropdown(): void {
    setTimeout(() => {
      if (
        this.autoCompleteRef
        && this.autocompleteTrigger
        && this.autoCompleteRef.panel
      ) {
        fromEvent(this.autoCompleteRef.panel.nativeElement, 'scroll')
          .pipe(
            debounceTime(300),
            map(() => this.autoCompleteRef.panel.nativeElement.scrollTop),
            takeUntil(this.autocompleteTrigger.panelClosingActions),
            untilDestroyed(this),
          )
          .subscribe(() => {
            const { scrollTop, scrollHeight, clientHeight: elementHeight } = this.autoCompleteRef.panel.nativeElement;
            const atBottom = scrollHeight === scrollTop + elementHeight;
            if (atBottom) {
              this.loadMoreUsers(this.filterValue, this.currentOffset);
            }
          });
      }
    });
  }

  loadMoreUsers(filterValue: string, offset: number): void {
    this.userService.userQueryDsCache(filterValue, offset)
      .pipe(
        map(this.userQueryResToOptions),
        untilDestroyed(this),
      )
      .subscribe((options) => {
        this.syncOptions = options;
        this.filteredOptions = offset === 0 ? of(options)
          : zip(this.filteredOptions, of(options))
            .pipe(map((optionsList) => optionsList[0].concat(optionsList[1])));
        this.currentOffset = offset + options.length;
      });
  }

  onChanged(changedValue: string): void {
    this.filterChanged$.next(changedValue);
  }

  resetInput(): void {
    this.currentOffset = 0;
    this.filterChanged$.next('');
    if (this.inputElementRef && this.inputElementRef.nativeElement) {
      this.inputElementRef.nativeElement.value = '';
    }
    this.selectedOption = null;
    this.onChange('');
  }

  registerOnChange(onChange: (value: string | number) => void): void {
    this.onChange = onChange;
  }

  registerOnTouched(onTouched: () => void): void {
    this.onTouch = onTouched;
  }

  optionSelected(option: Option): void {
    this.selectedOption = { ...option };
    this.currentOffset = 0;
    this.filterChanged$.next('');
    this.onChange(this.selectedOption.value);
  }

  displayWith(): string {
    return this.selectedOption ? this.selectedOption.label : '';
  }

  shouldShowResetInput(): boolean {
    return this.hasValue();
  }

  hasValue(): boolean {
    return this.inputElementRef?.nativeElement?.value && this.inputElementRef.nativeElement.value.length > 0;
  }

  setDisabledState?(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
    this.cdr.markForCheck();
  }
}
