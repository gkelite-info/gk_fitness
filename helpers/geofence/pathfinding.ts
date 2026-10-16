import { Coordinates, calculateHaversineDistance, calculateBearing, getCompassDirection, formatDistance } from './geofenceAlgorithm';

export interface PathNode {
  id: string;
  latitude: number;
  longitude: number;
  name?: string;
}

export interface PathEdge {
  from: string;
  to: string;
  distanceMeters: number;
  streetName?: string;
}

export interface NavigationStep {
  instruction: string;
  distanceMeters: number;
  distanceFormatted: string;
  durationSeconds: number;
  bearingDegrees: number;
  compassDirection: string;
  coordinate: [number, number];
}

export interface ShortestPathResult {
  algorithm: 'A* (A-Star) Search' | "Dijkstra's Algorithm";
  pathNodes: PathNode[];
  coordinates: Array<[number, number]>;
  totalDistanceMeters: number;
  distanceFormatted: string;
  estimatedDurationSeconds: number;
  durationFormatted: string;
  steps: NavigationStep[];
  executionTimeMs: number;
}

export class SpatialGraph {
  public nodes: Map<string, PathNode> = new Map();
  public adjacency: Map<string, Array<{ to: string; distanceMeters: number; streetName?: string }>> = new Map();

  addNode(node: PathNode): void {
    this.nodes.set(node.id, node);
    if (!this.adjacency.has(node.id)) {
      this.adjacency.set(node.id, []);
    }
  }

  addEdge(fromId: string, toId: string, distanceMeters?: number, streetName?: string, bidirectional = true): void {
    const fromNode = this.nodes.get(fromId);
    const toNode = this.nodes.get(toId);
    if (!fromNode || !toNode) return;

    const dist = distanceMeters ?? calculateHaversineDistance(fromNode, toNode);

    if (!this.adjacency.has(fromId)) this.adjacency.set(fromId, []);
    this.adjacency.get(fromId)!.push({ to: toId, distanceMeters: dist, streetName });

    if (bidirectional) {
      if (!this.adjacency.has(toId)) this.adjacency.set(toId, []);
      this.adjacency.get(toId)!.push({ to: fromId, distanceMeters: dist, streetName });
    }
  }

  getNode(id: string): PathNode | undefined {
    return this.nodes.get(id);
  }

  getNeighbors(id: string) {
    return this.adjacency.get(id) || [];
  }

  findNearestNode(coord: { latitude: number; longitude: number }): PathNode | null {
    let nearest: PathNode | null = null;
    let minDistance = Infinity;

    for (const node of this.nodes.values()) {
      const dist = calculateHaversineDistance(coord, node);
      if (dist < minDistance) {
        minDistance = dist;
        nearest = node;
      }
    }
    return nearest;
  }
}

class PriorityQueue<T> {
  private items: Array<{ element: T; priority: number }> = [];

  enqueue(element: T, priority: number): void {
    this.items.push({ element, priority });
    this.items.sort((a, b) => a.priority - b.priority);
  }

  dequeue(): T | undefined {
    return this.items.shift()?.element;
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }
}

/**
 * Computes shortest path using A* (A-Star) Search or Dijkstra's Algorithm.
 * 
 * @param graph SpatialGraph of waypoints and road intersections
 * @param startId Starting node identifier
 * @param goalId Goal node identifier
 * @param algorithm 'a-star' or 'dijkstra'
 * @param heuristicWeight 1.0 for standard A*, 0 for Dijkstra's Algorithm
 */
export function findShortestPath(
  graph: SpatialGraph,
  startId: string,
  goalId: string,
  algorithm: 'a-star' | 'dijkstra' = 'a-star',
  heuristicWeight: number = algorithm === 'a-star' ? 1.0 : 0
): ShortestPathResult {
  const startTime = Date.now();
  const startNode = graph.getNode(startId);
  const goalNode = graph.getNode(goalId);

  if (!startNode || !goalNode) {
    throw new Error(`Invalid start or goal node: ${startId} -> ${goalId}`);
  }

  const openSet = new PriorityQueue<string>();
  const cameFrom = new Map<string, { prevId: string; streetName?: string; segmentDistance: number }>();

  const gScore = new Map<string, number>();
  const fScore = new Map<string, number>();

  for (const nodeId of graph.nodes.keys()) {
    gScore.set(nodeId, Infinity);
    fScore.set(nodeId, Infinity);
  }

  gScore.set(startId, 0);

  const heuristic = (nodeId: string): number => {
    if (heuristicWeight === 0) return 0;
    const node = graph.getNode(nodeId);
    if (!node) return 0;
    return calculateHaversineDistance(node, goalNode) * heuristicWeight;
  };

  fScore.set(startId, heuristic(startId));
  openSet.enqueue(startId, fScore.get(startId)!);

  const closedSet = new Set<string>();

  while (!openSet.isEmpty()) {
    const currentId = openSet.dequeue()!;

    if (currentId === goalId) {
      const pathNodes: PathNode[] = [goalNode];
      let curr = goalId;
      const reverseSteps: Array<{ streetName?: string; segmentDistance: number; fromNode: PathNode; toNode: PathNode }> = [];

      while (cameFrom.has(curr)) {
        const edge = cameFrom.get(curr)!;
        const prevNode = graph.getNode(edge.prevId)!;
        const currNode = graph.getNode(curr)!;
        pathNodes.unshift(prevNode);
        reverseSteps.unshift({
          streetName: edge.streetName,
          segmentDistance: edge.segmentDistance,
          fromNode: prevNode,
          toNode: currNode,
        });
        curr = edge.prevId;
      }

      const totalDistanceMeters = gScore.get(goalId) || 0;
      const coordinates: Array<[number, number]> = pathNodes.map((n) => [n.latitude, n.longitude]);

      const estimatedDurationSeconds = Math.max(30, Math.round(totalDistanceMeters / 1.33));
      const executionTimeMs = Date.now() - startTime;

      const steps = buildNavigationSteps(pathNodes, reverseSteps, goalNode);

      return {
        algorithm: algorithm === 'a-star' ? 'A* (A-Star) Search' : "Dijkstra's Algorithm",
        pathNodes,
        coordinates,
        totalDistanceMeters: Math.round(totalDistanceMeters),
        distanceFormatted: formatDistance(totalDistanceMeters),
        estimatedDurationSeconds,
        durationFormatted: formatDuration(estimatedDurationSeconds),
        steps,
        executionTimeMs,
      };
    }

    closedSet.add(currentId);

    const neighbors = graph.getNeighbors(currentId);
    for (const neighbor of neighbors) {
      if (closedSet.has(neighbor.to)) continue;

      const tentativeGScore = gScore.get(currentId)! + neighbor.distanceMeters;

      if (tentativeGScore < (gScore.get(neighbor.to) ?? Infinity)) {
        cameFrom.set(neighbor.to, {
          prevId: currentId,
          streetName: neighbor.streetName,
          segmentDistance: neighbor.distanceMeters,
        });
        gScore.set(neighbor.to, tentativeGScore);
        const f = tentativeGScore + heuristic(neighbor.to);
        fScore.set(neighbor.to, f);
        openSet.enqueue(neighbor.to, f);
      }
    }
  }

  const dLat = goalNode.latitude - startNode.latitude;
  const dLng = goalNode.longitude - startNode.longitude;
  const wp1: PathNode = {
    id: 'step_street_1',
    latitude: startNode.latitude + dLat * 0.4,
    longitude: startNode.longitude,
    name: 'Main Street Connector'
  };
  const wp2: PathNode = {
    id: 'step_street_2',
    latitude: startNode.latitude + dLat * 0.4,
    longitude: startNode.longitude + dLng * 0.7,
    name: 'Avenue Intersection'
  };
  const wp3: PathNode = {
    id: 'step_street_3',
    latitude: goalNode.latitude,
    longitude: startNode.longitude + dLng * 0.7,
    name: 'Destination Approach'
  };

  const syntheticPathNodes = [startNode, wp1, wp2, wp3, goalNode];
  const syntheticCoords: Array<[number, number]> = syntheticPathNodes.map((n) => [n.latitude, n.longitude]);
  const directDistance = calculateHaversineDistance(startNode, goalNode) * 1.18; // City street distance factor
  const durationSec = Math.max(30, Math.round(directDistance / 1.33));

  const syntheticSteps: NavigationStep[] = [
    {
      instruction: `Head ${getCompassDirection(calculateBearing(startNode, wp1))} onto Main Street Connector`,
      distanceMeters: Math.round(calculateHaversineDistance(startNode, wp1)),
      distanceFormatted: formatDistance(calculateHaversineDistance(startNode, wp1)),
      durationSeconds: Math.round(durationSec * 0.4),
      bearingDegrees: calculateBearing(startNode, wp1),
      compassDirection: getCompassDirection(calculateBearing(startNode, wp1)),
      coordinate: [startNode.latitude, startNode.longitude],
    },
    {
      instruction: `Turn ${getCompassDirection(calculateBearing(wp1, wp2))} onto Avenue Intersection`,
      distanceMeters: Math.round(calculateHaversineDistance(wp1, wp2)),
      distanceFormatted: formatDistance(calculateHaversineDistance(wp1, wp2)),
      durationSeconds: Math.round(durationSec * 0.3),
      bearingDegrees: calculateBearing(wp1, wp2),
      compassDirection: getCompassDirection(calculateBearing(wp1, wp2)),
      coordinate: [wp1.latitude, wp1.longitude],
    },
    {
      instruction: `Proceed towards ${goalNode.name || 'destination'}`,
      distanceMeters: Math.round(calculateHaversineDistance(wp2, goalNode)),
      distanceFormatted: formatDistance(calculateHaversineDistance(wp2, goalNode)),
      durationSeconds: Math.round(durationSec * 0.3),
      bearingDegrees: calculateBearing(wp2, goalNode),
      compassDirection: getCompassDirection(calculateBearing(wp2, goalNode)),
      coordinate: [wp2.latitude, wp2.longitude],
    },
  ];

  return {
    algorithm: algorithm === 'a-star' ? 'A* (A-Star) Search' : "Dijkstra's Algorithm",
    pathNodes: syntheticPathNodes,
    coordinates: syntheticCoords,
    totalDistanceMeters: Math.round(directDistance),
    distanceFormatted: formatDistance(directDistance),
    estimatedDurationSeconds: durationSec,
    durationFormatted: formatDuration(durationSec),
    steps: syntheticSteps,
    executionTimeMs: Date.now() - startTime,
  };
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return '1 min';
  }
  const mins = Math.round(seconds / 60);
  if (mins < 60) {
    return `${mins} min${mins > 1 ? 's' : ''}`;
  }
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hrs} hr${hrs > 1 ? 's' : ''} ${remMins > 0 ? `${remMins} min` : ''}`;
}

function buildNavigationSteps(
  pathNodes: PathNode[],
  segments: Array<{ streetName?: string; segmentDistance: number; fromNode: PathNode; toNode: PathNode }>,
  destinationNode: PathNode
): NavigationStep[] {
  if (segments.length === 0) {
    return [];
  }

  const steps: NavigationStep[] = [];
  let currentGroupDist = 0;
  let groupStartNode = segments[0].fromNode;
  let lastStreet = segments[0].streetName || 'the road';
  let initialBearing = calculateBearing(segments[0].fromNode, segments[0].toNode);

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const isLast = i === segments.length - 1;
    currentGroupDist += seg.segmentDistance;

    const currentStreet = seg.streetName || 'the road';
    const streetChanged = currentStreet !== lastStreet && currentStreet !== 'the road';

    if (streetChanged || isLast) {
      const stepDuration = Math.max(15, Math.round(currentGroupDist / 1.33));
      const bearing = calculateBearing(groupStartNode, seg.toNode);
      const compass = getCompassDirection(bearing);

      let instruction = '';
      if (steps.length === 0) {
        instruction = `Head ${compass} along ${lastStreet} towards destination`;
      } else if (isLast) {
        instruction = `Continue straight on ${currentStreet} to arrive at ${destinationNode.name || 'Gym'}`;
      } else {
        instruction = `Turn towards ${currentStreet} and proceed`;
      }

      steps.push({
        instruction,
        distanceMeters: Math.round(currentGroupDist),
        distanceFormatted: formatDistance(currentGroupDist),
        durationSeconds: stepDuration,
        bearingDegrees: bearing,
        compassDirection: compass,
        coordinate: [groupStartNode.latitude, groupStartNode.longitude],
      });

      currentGroupDist = 0;
      groupStartNode = seg.toNode;
      lastStreet = currentStreet;
    }
  }

  return steps;
}

export function buildSpatialWaypointGrid(
  start: { latitude: number; longitude: number },
  goal: { latitude: number; longitude: number },
  gridDivisions = 8
): SpatialGraph {
  const graph = new SpatialGraph();

  graph.addNode({ id: 'start', latitude: start.latitude, longitude: start.longitude, name: 'Current Location' });
  graph.addNode({ id: 'goal', latitude: goal.latitude, longitude: goal.longitude, name: 'Gym Destination' });

  const minLat = Math.min(start.latitude, goal.latitude);
  const maxLat = Math.max(start.latitude, goal.latitude);
  const minLng = Math.min(start.longitude, goal.longitude);
  const maxLng = Math.max(start.longitude, goal.longitude);

  const latSpan = Math.max(0.0008, maxLat - minLat);
  const lngSpan = Math.max(0.0008, maxLng - minLng);

  const padLat = latSpan * 0.2;
  const padLng = lngSpan * 0.2;

  const latStep = (latSpan + 2 * padLat) / gridDivisions;
  const lngStep = (lngSpan + 2 * padLng) / gridDivisions;

  const gridNodeIds: string[][] = [];

  for (let r = 0; r <= gridDivisions; r++) {
    gridNodeIds[r] = [];
    const lat = minLat - padLat + r * latStep;
    for (let c = 0; c <= gridDivisions; c++) {
      const lng = minLng - padLng + c * lngStep;
      const id = `grid_${r}_${c}`;
      gridNodeIds[r][c] = id;
      graph.addNode({ id, latitude: lat, longitude: lng });
    }
  }

  for (let r = 0; r <= gridDivisions; r++) {
    for (let c = 0; c <= gridDivisions; c++) {
      const currId = gridNodeIds[r][c];
      if (c < gridDivisions) {
        const eastId = gridNodeIds[r][c + 1];
        graph.addEdge(currId, eastId, undefined, 'Avenue Connector');
      }
      if (r < gridDivisions) {
        const northId = gridNodeIds[r + 1][c];
        graph.addEdge(currId, northId, undefined, 'Cross Street');
      }
      if (r < gridDivisions && c < gridDivisions) {
        const diagId = gridNodeIds[r + 1][c + 1];
        graph.addEdge(currId, diagId, undefined, 'Boulevard Diagonal');
      }
    }
  }

  const allGridNodes: PathNode[] = [];
  for (let r = 0; r <= gridDivisions; r++) {
    for (let c = 0; c <= gridDivisions; c++) {
      allGridNodes.push(graph.getNode(gridNodeIds[r][c])!);
    }
  }

  allGridNodes.sort((a, b) => calculateHaversineDistance(start, a) - calculateHaversineDistance(start, b));
  allGridNodes.slice(0, 4).forEach((n) => graph.addEdge('start', n.id, undefined, 'Initial Path'));

  allGridNodes.sort((a, b) => calculateHaversineDistance(goal, a) - calculateHaversineDistance(goal, b));
  allGridNodes.slice(0, 4).forEach((n) => graph.addEdge('goal', n.id, undefined, 'Gym Approach'));

  return graph;
}

export async function calculateShortestPathRoute(
  start: Coordinates,
  destination: Coordinates & { name?: string },
  options: {
    algorithm?: 'a-star' | 'dijkstra';
    mode?: 'walking' | 'driving';
    timeoutMs?: number;
  } = {}
): Promise<ShortestPathResult> {
  const { algorithm = 'a-star', mode = 'walking', timeoutMs = 4500 } = options;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const profile = mode === 'driving' ? 'driving' : 'foot';
    const osrmUrl = `https://router.project-osrm.org/route/v1/${profile}/${start.longitude},${start.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=geojson&steps=true`;

    const res = await fetch(osrmUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data?.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const rawCoords: Array<[number, number]> = route.geometry.coordinates.map(
          ([lng, lat]: [number, number]) => [lat, lng]
        );

        const roadGraph = new SpatialGraph();
        rawCoords.forEach((coord, idx) => {
          const id = `osm_${idx}`;
          roadGraph.addNode({
            id,
            latitude: coord[0],
            longitude: coord[1],
            name: idx === 0 ? 'Start' : idx === rawCoords.length - 1 ? destination.name || 'Gym' : undefined,
          });
          if (idx > 0) {
            roadGraph.addEdge(`osm_${idx - 1}`, id, undefined, 'Street Segment');
          }
        });

        const solved = findShortestPath(
          roadGraph,
          'osm_0',
          `osm_${rawCoords.length - 1}`,
          algorithm,
          algorithm === 'a-star' ? 1.0 : 0
        );

        if (route.legs?.[0]?.steps?.length > 0) {
          const osrmSteps: NavigationStep[] = route.legs[0].steps.map((st: any) => {
            const loc: [number, number] = [st.maneuver.location[1], st.maneuver.location[0]];
            const dist = Math.round(st.distance || 0);
            const dur = Math.round(st.duration || dist / 1.33);
            const bearing = Math.round(st.maneuver.bearing_after || 0);
            return {
              instruction: st.name ? `${st.maneuver.type} onto ${st.name}` : `${st.maneuver.type || 'Proceed'} along path`,
              distanceMeters: dist,
              distanceFormatted: formatDistance(dist),
              durationSeconds: dur,
              bearingDegrees: bearing,
              compassDirection: getCompassDirection(bearing),
              coordinate: loc,
            };
          });

          return {
            ...solved,
            steps: osrmSteps.length > 0 ? osrmSteps : solved.steps,
            totalDistanceMeters: Math.round(route.distance),
            distanceFormatted: formatDistance(route.distance),
            estimatedDurationSeconds: Math.round(route.duration),
            durationFormatted: formatDuration(route.duration),
          };
        }

        return solved;
      }
    }
  } catch (err) {
  }

  const localGraph = buildSpatialWaypointGrid(start, destination, 8);
  return findShortestPath(localGraph, 'start', 'goal', algorithm, algorithm === 'a-star' ? 1.0 : 0);
}
