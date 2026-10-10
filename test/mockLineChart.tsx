import { View } from 'react-native';

// Stand-in for react-native-chart-kit's LineChart: renders nothing visual but
// keeps the plotted data on the element so tests can read it back.
export function LineChart(props: { data: unknown }) {
  // @ts-expect-error chartData is a test-only prop, read back via testID
  return <View testID="line-chart" chartData={props.data} />;
}
