import { View } from 'react-native';

// Stand-in for react-native-chart-kit's LineChart: renders nothing visual but
// keeps the plotted data, width and tap handler on the element so tests can
// read them back and "tap" a data point.
export function LineChart(props: {
  data: unknown;
  width: number;
  onDataPointClick?: (point: { index: number; value: number; x: number; y: number }) => void;
}) {
  return (
    <View
      testID="line-chart"
      // @ts-expect-error test-only props, read back via testID
      chartData={props.data}
      chartWidth={props.width}
      onDataPointClick={props.onDataPointClick}
    />
  );
}
