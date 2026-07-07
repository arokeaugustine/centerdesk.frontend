import { Component, ElementRef, NgZone, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import * as am5 from '@amcharts/amcharts5';
import * as am5map from '@amcharts/amcharts5/map';
import am5geodata_worldLow from '@amcharts/amcharts5-geodata/worldLow';

@Component({
  selector: 'app-country-map',
  imports: [],
  template: `<div #chartdiv style="width: 100%; height: 212px; border-radius: 1rem;"></div>`,
})
export class CountryMap implements OnInit, OnDestroy {
  private readonly zone = inject(NgZone);
  @ViewChild('chartdiv', { static: true }) chartdiv!: ElementRef;
  root!: am5.Root;

  ngOnInit(): void {
    this.zone.runOutsideAngular(() => {
      this.root = am5.Root.new(this.chartdiv.nativeElement);

      const chart = this.root.container.children.push(
        am5map.MapChart.new(this.root, {
          panX: 'none',
          panY: 'none',
          wheelX: 'none',
          wheelY: 'none',
          projection: am5map.geoMercator(),
        })
      );

      const polygonSeries = chart.series.push(
        am5map.MapPolygonSeries.new(this.root, {
          geoJSON: am5geodata_worldLow,
          exclude: ['AQ'],
        })
      );

      polygonSeries.mapPolygons.template.setAll({
        tooltipText: '{name}',
        interactive: true,
        fill: am5.color(0xe5eaf2),
        stroke: am5.color(0xd0d5dd),
      });

      polygonSeries.mapPolygons.template.states.create('hover', {
        fill: am5.color(0x465fff),
      });

      const pointSeries = chart.series.push(am5map.MapPointSeries.new(this.root, {}));

      const markers = [
        { lat: 37.258, lon: -104.657, name: 'United States' },
        { lat: 20.75, lon: 73.727, name: 'India' },
        { lat: 53.613, lon: -11.636, name: 'United Kingdom' },
        { lat: -25.03, lon: 115.209, name: 'Australia' },
      ];

      markers.forEach(m => {
        pointSeries.pushDataItem({ latitude: m.lat, longitude: m.lon });
        pointSeries.bullets.push(() =>
          am5.Bullet.new(this.root, {
            sprite: am5.Circle.new(this.root, {
              radius: 6,
              fill: am5.color(0x465fff),
              stroke: am5.color(0xffffff),
              strokeWidth: 2,
              tooltipText: m.name,
            }),
          })
        );
      });
    });
  }

  ngOnDestroy(): void {
    this.root?.dispose();
  }
}
