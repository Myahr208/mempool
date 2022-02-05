import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NgbTypeahead } from '@ng-bootstrap/ng-bootstrap';
import { merge, Observable, of, Subject } from 'rxjs';
import { distinctUntilChanged, filter, map, switchMap } from 'rxjs/operators';
import { AssetExtended } from 'src/app/interfaces/electrs.interface';
import { AssetsService } from 'src/app/services/assets.service';
import { SeoService } from 'src/app/services/seo.service';
import { StateService } from 'src/app/services/state.service';
import { RelativeUrlPipe } from 'src/app/shared/pipes/relative-url/relative-url.pipe';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-assets-nav',
  templateUrl: './assets-nav.component.html',
  styleUrls: ['./assets-nav.component.scss']
})
export class AssetsNavComponent implements OnInit {
  @ViewChild('instance', {static: true}) instance: NgbTypeahead;
  nativeAssetId = this.stateService.network === 'liquidtestnet' ? environment.nativeTestAssetId : environment.nativeAssetId;
  searchForm: FormGroup;
  assetsCache: AssetExtended[];

  typeaheadSearchFn: ((text: Observable<string>) => Observable<readonly any[]>);
  formatterFn = (asset: AssetExtended) => asset.name + ' (' + asset.ticker  + ')';
  focus$ = new Subject<string>();
  click$ = new Subject<string>();

  itemsPerPage = 15;

  constructor(
    private formBuilder: FormBuilder,
    private seoService: SeoService,
    private router: Router,
    private assetsService: AssetsService,
    private stateService: StateService,
    private relativeUrlPipe: RelativeUrlPipe,
  ) { }

  ngOnInit(): void {
    this.typeaheadSearchFn = this.typeaheadSearch;

    this.searchForm = this.formBuilder.group({
      searchText: [{ value: '', disabled: false }, Validators.required]
    });
  }

  typeaheadSearch = (text$: Observable<string>) => {
    const debouncedText$ = text$.pipe(
      distinctUntilChanged()
    );
    const clicksWithClosedPopup$ = this.click$.pipe(filter(() => !this.instance.isPopupOpen()));
    const inputFocus$ = this.focus$;

    return merge(debouncedText$, inputFocus$, clicksWithClosedPopup$)
      .pipe(
        switchMap((searchText) => {
          if (!searchText.length) {
            return of([]);
          }
          return this.assetsService.getAssetsJson$.pipe(
            map((assets) => {
              if (searchText.length ) {
                const filteredAssets = assets.filter((asset) => asset.name.toLowerCase().indexOf(searchText.toLowerCase()) > -1
                  || (asset.ticker || '').toLowerCase().indexOf(searchText.toLowerCase()) > -1
                  || (asset.entity && asset.entity.domain || '').toLowerCase().indexOf(searchText.toLowerCase()) > -1);
                assets = filteredAssets;
                return filteredAssets.slice(0, this.itemsPerPage);
              } else {
                return assets.slice(0, this.itemsPerPage);
              }
            })
          )
        }),
      );
  }

  itemSelected() {
    setTimeout(() => this.search());
  }

  search() {
    const searchText = this.searchForm.value.searchText;
    this.navigate('/assets/asset/', searchText.asset_id);
  }

  navigate(url: string, searchText: string, extras?: any) {
    this.router.navigate([this.relativeUrlPipe.transform(url), searchText], extras);
    this.searchForm.setValue({
      searchText: '',
    });
  }

}
