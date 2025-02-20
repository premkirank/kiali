import * as React from 'react';
import { connect } from 'react-redux';
import {
  Card,
  CardActions,
  CardBody,
  CardHeader,
  CardTitle,
  Dropdown,
  DropdownItem,
  KebabToggle,
  ToolbarItem
} from '@patternfly/react-core';
import { history } from '../../app/History';
import { GraphDataSource } from '../../services/GraphDataSource';
import { DecoratedGraphElements, EdgeMode, GraphType, NodeType } from '../../types/Graph';
import { CytoscapeGraph, GraphEdgeTapEvent, GraphNodeTapEvent } from './CytoscapeGraph';
import { GraphUrlParams, makeNodeGraphUrlFromParams } from 'components/Nav/NavUtils';
import { store } from 'store/ConfigStore';
import { kialiStyle } from 'styles/StyleUtils';
import { toRangeString } from '../Time/Utils';
import { TimeInMilliseconds } from '../../types/Common';
import { ServiceDetailsInfo } from '../../types/ServiceInfo';
import { KialiDagreGraph } from './graphs/KialiDagreGraph';
import { KialiAppState } from '../../store/Store';
import { isParentKiosk, kioskContextMenuAction } from '../Kiosk/KioskActions';
import { LoadingWizardActionsDropdownGroup } from '../IstioWizards/LoadingWizardActionsDropdownGroup';
import { ServiceWizardActionsDropdownGroup } from '../IstioWizards/ServiceWizardActionsDropdownGroup';
import { WizardAction, WizardMode } from '../IstioWizards/WizardActions';
import { TimeDurationModal } from '../Time/TimeDurationModal';
import { TimeDurationIndicator } from '../Time/TimeDurationIndicator';
import { KioskElement } from '../Kiosk/KioskElement';
import { GraphSelectorBuilder } from 'pages/Graph/GraphSelector';
import { isMultiCluster } from '../../config';

const initGraphContainerStyle = kialiStyle({ width: '100%', height: '100%' });

type ReduxProps = {
  kiosk: string;
  theme: string;
};

type MiniGraphCardProps = ReduxProps & {
  dataSource: GraphDataSource;
  graphContainerStyle?: string;
  onDeleteTrafficRouting?: (key: string) => void;
  onEdgeTap?: (e: GraphEdgeTapEvent) => void;
  onLaunchWizard?: (key: WizardAction, mode: WizardMode) => void;
  serviceDetails?: ServiceDetailsInfo | null;
};

type MiniGraphCardState = {
  isKebabOpen: boolean;
  isTimeOptionsOpen: boolean;
  graphData: DecoratedGraphElements;
};

class MiniGraphCardComponent extends React.Component<MiniGraphCardProps, MiniGraphCardState> {
  private cytoscapeGraphRef: any;

  constructor(props) {
    super(props);
    this.cytoscapeGraphRef = React.createRef();
    this.state = { isKebabOpen: false, isTimeOptionsOpen: false, graphData: props.dataSource.graphData };
  }

  componentDidMount() {
    this.props.dataSource.on('fetchSuccess', this.refresh);
    this.props.dataSource.on('fetchError', this.refresh);
  }

  componentWillUnmount() {
    this.props.dataSource.removeListener('fetchSuccess', this.refresh);
    this.props.dataSource.removeListener('fetchError', this.refresh);
  }

  private refresh = () => {
    this.setState({ graphData: this.props.dataSource.graphData });
  };

  render() {
    const graphCardActions = [
      <DropdownItem key="viewFullGraph" onClick={this.onViewFullGraph}>
        Show full graph
      </DropdownItem>
    ];
    if (isParentKiosk(this.props.kiosk)) {
      if (this.props.serviceDetails === undefined) {
        graphCardActions.push(<LoadingWizardActionsDropdownGroup />);
      } else if (this.props.serviceDetails) {
        graphCardActions.push(
          <ServiceWizardActionsDropdownGroup
            virtualServices={this.props.serviceDetails.virtualServices || []}
            destinationRules={this.props.serviceDetails.destinationRules || []}
            k8sHTTPRoutes={this.props.serviceDetails.k8sHTTPRoutes || []}
            istioPermissions={this.props.serviceDetails.istioPermissions}
            onAction={this.handleLaunchWizard}
            onDelete={this.handleDeleteTrafficRouting}
          />
        );
      }
    } else {
      graphCardActions.push(
        <DropdownItem key="viewNodeGraph" onClick={this.onViewNodeGraph}>
          Show node graph
        </DropdownItem>
      );
    }

    const rangeEnd: TimeInMilliseconds = this.props.dataSource.graphTimestamp * 1000;
    const rangeStart: TimeInMilliseconds = rangeEnd - this.props.dataSource.graphDuration * 1000;
    const intervalTitle =
      rangeEnd > 0 ? toRangeString(rangeStart, rangeEnd, { second: '2-digit' }, { second: '2-digit' }) : 'Loading';

    return (
      <>
        <Card style={{ height: '100%' }} id={'MiniGraphCard'} data-test="mini-graph">
          <CardHeader>
            <CardActions>
              <KioskElement>
                <ToolbarItem>
                  <TimeDurationIndicator onClick={this.toggleTimeOptionsVisibility} isDuration={true} />
                </ToolbarItem>
              </KioskElement>
              <Dropdown
                toggle={<KebabToggle onToggle={this.onGraphActionsToggle} />}
                dropdownItems={graphCardActions}
                isPlain
                isOpen={this.state.isKebabOpen}
                position={'right'}
              />
            </CardActions>
            <CardTitle style={{ float: 'left' }}>{intervalTitle}</CardTitle>
          </CardHeader>
          <CardBody>
            <div style={{ height: '100%' }}>
              <CytoscapeGraph
                compressOnHide={true}
                containerClassName={
                  this.props.graphContainerStyle ? this.props.graphContainerStyle : initGraphContainerStyle
                }
                graphData={{
                  elements: this.state.graphData,
                  elementsChanged: true,
                  errorMessage: !!this.props.dataSource.errorMessage ? this.props.dataSource.errorMessage : undefined,
                  isError: this.props.dataSource.isError,
                  isLoading: this.props.dataSource.isLoading,
                  fetchParams: this.props.dataSource.fetchParameters,
                  timestamp: this.props.dataSource.graphTimestamp
                }}
                toggleIdleNodes={() => undefined}
                edgeLabels={this.props.dataSource.fetchParameters.edgeLabels}
                edgeMode={EdgeMode.ALL}
                isMiniGraph={true}
                onEdgeTap={this.props.onEdgeTap}
                layout={KialiDagreGraph.getLayout()}
                namespaceLayout={KialiDagreGraph.getLayout()}
                onNodeTap={this.handleNodeTap}
                // Ranking not enabled for minigraphs yet
                rankBy={[]}
                ref={refInstance => this.setCytoscapeGraph(refInstance)}
                refreshInterval={0}
                setRankResult={undefined}
                showIdleEdges={false}
                showOperationNodes={false}
                showOutOfMesh={true}
                showRank={false}
                showSecurity={true}
                showServiceNodes={true}
                showTrafficAnimation={false}
                showIdleNodes={false}
                showVirtualServices={true}
                summaryData={null}
                theme={this.props.theme}
              />
            </div>
          </CardBody>
        </Card>
        <TimeDurationModal
          customDuration={false}
          isOpen={this.state.isTimeOptionsOpen}
          onConfirm={this.toggleTimeOptionsVisibility}
          onCancel={this.toggleTimeOptionsVisibility}
        />
      </>
    );
  }

  private setCytoscapeGraph(cytoscapeGraph: any) {
    this.cytoscapeGraphRef.current = cytoscapeGraph;
  }

  private handleLaunchWizard = (key: WizardAction, mode: WizardMode) => {
    this.onGraphActionsToggle(false);
    if (this.props.onLaunchWizard) {
      this.props.onLaunchWizard(key, mode);
    }
  };

  private handleDeleteTrafficRouting = (key: string) => {
    this.onGraphActionsToggle(false);
    if (this.props.onDeleteTrafficRouting) {
      this.props.onDeleteTrafficRouting(key);
    }
  };

  private handleNodeTap = (e: GraphNodeTapEvent) => {
    // Do nothing on inaccessible nodes or service entry nodes
    if (e.isInaccessible || e.isServiceEntry) {
      return;
    }

    // If we are already on the details page of the tapped node, do nothing.
    const displayedNode = this.props.dataSource.fetchParameters.node;
    // Minigraph will consider box nodes as app
    const eNodeType = e.nodeType === 'box' && e.isBox ? e.isBox : e.workload ? 'workload' : e.nodeType;
    const isSameResource =
      displayedNode?.namespace.name === e.namespace &&
      displayedNode.nodeType === eNodeType &&
      displayedNode[displayedNode.nodeType] === e[eNodeType];

    if (isSameResource) {
      return;
    }

    // unselect the currently selected node
    const cy = this.cytoscapeGraphRef.current.getCy();
    if (cy) {
      cy.$(':selected').selectify().unselect().unselectify();
    }

    // Redirect to the details page of the tapped node.
    let resource = e[eNodeType];
    let resourceType: string = eNodeType === NodeType.APP ? 'application' : eNodeType;

    let href = `/namespaces/${e.namespace}/${resourceType}s/${resource}`;

    if (e.cluster && isMultiCluster()) {
      href = href + '?clusterName=' + e.cluster;
    }

    if (isParentKiosk(this.props.kiosk)) {
      kioskContextMenuAction(href);
    } else {
      history.push(href);
    }
  };

  private onGraphActionsToggle = (isOpen: boolean) => {
    this.setState({
      isKebabOpen: isOpen
    });
  };

  private onViewFullGraph = () => {
    const namespace = this.props.dataSource.fetchParameters.namespaces[0].name;
    let graphSelector = new GraphSelectorBuilder().namespace(namespace);
    let graphType: GraphType = GraphType.APP;

    switch (this.props.dataSource.fetchParameters.node!.nodeType) {
      case NodeType.AGGREGATE:
        graphSelector = graphSelector
          .aggregate(
            this.props.dataSource.fetchParameters.node!.aggregate!,
            this.props.dataSource.fetchParameters.node!.aggregateValue!
          )
          .nodeType(NodeType.AGGREGATE);
        break;
      case NodeType.APP:
        graphSelector = graphSelector.app(this.props.dataSource.fetchParameters.node!.app).nodeType(NodeType.APP);
        break;
      case NodeType.SERVICE:
        graphType = GraphType.SERVICE;
        graphSelector = graphSelector.service(this.props.dataSource.fetchParameters.node!.service);
        break;
      case NodeType.WORKLOAD:
        graphType = GraphType.WORKLOAD;
        graphSelector = graphSelector.workload(this.props.dataSource.fetchParameters.node!.workload);
        break;
      default:
        // NodeType.BOX is n/a
        break;
    }

    const graphUrl = `/graph/namespaces?graphType=${graphType}&injectServiceNodes=true&namespaces=${namespace}&focusSelector=${encodeURI(
      graphSelector.build()
    )}`;

    if (isParentKiosk(this.props.kiosk)) {
      kioskContextMenuAction(graphUrl);
    } else {
      history.push(graphUrl);
    }
  };

  private onViewNodeGraph = () => {
    let graphType = this.props.dataSource.fetchParameters.graphType;
    switch (this.props.dataSource.fetchParameters.node!.nodeType) {
      case NodeType.APP:
        graphType = GraphType.APP;
        break;
      case NodeType.SERVICE:
        graphType = GraphType.SERVICE;
        break;
      case NodeType.WORKLOAD:
        graphType = GraphType.WORKLOAD;
        break;
    }

    const urlParams: GraphUrlParams = {
      activeNamespaces: this.props.dataSource.fetchParameters.namespaces,
      duration: this.props.dataSource.fetchParameters.duration,
      edgeLabels: this.props.dataSource.fetchParameters.edgeLabels,
      edgeMode: EdgeMode.ALL,
      graphLayout: store.getState().graph.layout,
      namespaceLayout: store.getState().graph.namespaceLayout,
      graphType: graphType,
      node: this.props.dataSource.fetchParameters.node!,
      refreshInterval: store.getState().userSettings.refreshInterval,
      showIdleEdges: this.props.dataSource.fetchParameters.showIdleEdges,
      showIdleNodes: this.props.dataSource.fetchParameters.showIdleNodes,
      showOperationNodes: this.props.dataSource.fetchParameters.showOperationNodes,
      showServiceNodes: true,
      trafficRates: this.props.dataSource.fetchParameters.trafficRates
    };

    // To ensure updated components get the updated URL, update the URL first and then the state
    history.push(makeNodeGraphUrlFromParams(urlParams));
  };

  private toggleTimeOptionsVisibility = () => {
    this.setState(prevState => ({ isTimeOptionsOpen: !prevState.isTimeOptionsOpen }));
  };
}

const mapStateToProps = (state: KialiAppState): ReduxProps => ({
  kiosk: state.globalState.kiosk,
  theme: state.globalState.theme
});

export const MiniGraphCard = connect(mapStateToProps)(MiniGraphCardComponent);
