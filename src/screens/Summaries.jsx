import { HeadcountSummary } from './Headcount.jsx';
import { PeopleSummary } from './People.jsx';
import { RealEstateSummary } from './RealEstate.jsx';
import { TechnologySummary } from './Technology.jsx';
import { CenterSummary } from './CenterOps.jsx';

const VIEWS = { headcount: HeadcountSummary, people: PeopleSummary, realEstate: RealEstateSummary, technology: TechnologySummary, center: CenterSummary };

export function Summaries(props) {
  const View = VIEWS[props.page] || HeadcountSummary;
  return <View {...props} />;
}
