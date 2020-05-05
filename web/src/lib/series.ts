import { Run, ParseDate } from '@/generated';

// copied from 'apexcharts.ApexAxisChartSeries'
type ApexAxisChartSingleSeries = {
  name?: string;
  type?: string;
  data: { x: any; y: any; fillColor?: string; strokeColor?: string }[];
};

type ApexAxisChartSeries = ApexAxisChartSingleSeries[];

enum MetricBuiltins {
  NSPEROP = 'NsPerOp',
  MEM_BYPTESPEROP = 'Mem.BytesPerOp',
  MEM_ALLOCSPEROP = 'Mem.AllocsPerOp',
}

type ChartSet = { [metric: string]: ApexAxisChartSeries };

const defaultMetrics = {
  [MetricBuiltins.NSPEROP]: true,
  [MetricBuiltins.MEM_BYPTESPEROP]: true,
  [MetricBuiltins.MEM_ALLOCSPEROP]: true,
};

/**
 * Generates one set ApexAxisChartSeries per metric for the provided group of pkg, benches
 * 
 * @param runs 
 * @param pkg 
 * @param benches 
 * @param metrics 
 */
export function generateSeries(
  runs: Run[], pkg: RegExp, benches: RegExp[], metrics: { [metric: string]: boolean } = defaultMetrics,
): ChartSet {
  // by default, include all builtins
  if (Object.keys(metrics).length === 0) {
    metrics = defaultMetrics;
  }
  const metricKeys = Object.keys(metrics).filter((m: string) => metrics[m]);

  // set up index:
  // * each metric creates a chart
  // * each chart gets a set of series, corresponding to matching benchmarks
  const index = metricKeys.reduce((acc: ChartSet, cur) => {
    acc[cur] = [];
    return acc;
  }, {});

  // check each run for suites
  for (let rID = 0; rID < runs.length; rID += 1) {
    const run = runs[rID];

    // check each suite for measurements
    for (let sID = 0; sID < run.Suites.length; sID += 1) {
      const suite = run.Suites[sID];
      if (!pkg.test(suite.Pkg)) continue;

      // check each measurement for matching benchmarks
      for (let bID = 0; bID < suite.Benchmarks.length; bID += 1) {
        const bench = suite.Benchmarks[bID];
        for (let i = 0; i < benches.length; i += 1) {
          const benchMatch = benches[i];
          if (!benchMatch.test(bench.Name)) continue;

          // add benchmark data
          for (let mID = 0; mID < metricKeys.length; mID += 1) {
            const metric = metricKeys[mID];
            const existingSeries = index[metric].find((v) => v.name === bench.Name);
            if (!existingSeries) {
              index[metric].push({
                name: bench.Name,
                data: [],
              });
            }
            const series = existingSeries || index[metric][index[metric].length-1];
            const x = ParseDate(run.Date);
            switch (metric) {
            case MetricBuiltins.NSPEROP:
              series.data.push({ x, y: bench.NsPerOp });
              break;
            case MetricBuiltins.MEM_ALLOCSPEROP:
              series.data.push({ x, y: bench.Mem.AllocsPerOp });
              break;
            case MetricBuiltins.MEM_BYPTESPEROP:
              series.data.push({ x, y: bench.Mem.BytesPerOp });
              break;
            default:
              // assume custom if metric is not a builtin
              if (bench.Custom && bench.Custom[metric]) {
                series.data.push({ x, y: bench.Custom[metric] });
              }
            }
          }
        }
      }
    }
  }

  return index;
}
