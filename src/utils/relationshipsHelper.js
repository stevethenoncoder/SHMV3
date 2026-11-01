/**
 * Relationships & Sankey Flow computation helpers.
 * Computes bipartite flow matrices between any two meal dimensions
 * and generates SVG Sankey layout geometry (nodes and bezier ribbons).
 */

export const AVAILABLE_CATEGORIES = [
  { key: 'people', label: 'People / Companions', singular: 'Person' },
  { key: 'cuisine', label: 'Cuisine / Restaurant Type', singular: 'Cuisine' },
  { key: 'country', label: 'Country', singular: 'Country' },
  { key: 'city', label: 'City', singular: 'City' },
  { key: 'dishType', label: 'Dish Type', singular: 'Dish Type' },
  { key: 'food', label: 'Specific Dish', singular: 'Dish' },
  { key: 'restaurant', label: 'Restaurant', singular: 'Restaurant' },
  { key: 'rating', label: 'Meal Rating', singular: 'Rating' },
  { key: 'decade', label: 'Decade', singular: 'Decade' },
];

/**
 * Extracts array of values for a given category key from a meal object.
 */
export function getMealCategoryValues(meal, categoryKey) {
  if (!meal) return [];
  switch (categoryKey) {
    case 'people':
      if (!Array.isArray(meal.companions)) return [];
      return meal.companions
        .map((c) => (c?.publicName || c?.name)?.trim())
        .filter(Boolean);

    case 'country':
      return meal.restaurant?.city?.country?.name
        ? [meal.restaurant.city.country.name.trim()]
        : [];

    case 'city':
      return meal.restaurant?.city?.name
        ? [meal.restaurant.city.name.trim()]
        : [];

    case 'cuisine':
      return meal.restaurant?.type?.name
        ? [meal.restaurant.type.name.trim()]
        : [];

    case 'dishType':
      if (!Array.isArray(meal.mains)) return [];
      return Array.from(
        new Set(
          meal.mains
            .map((m) => m.food?.foodType?.name?.trim())
            .filter(Boolean)
        )
      );

    case 'food':
      if (!Array.isArray(meal.mains)) return [];
      return Array.from(
        new Set(
          meal.mains
            .map((m) => m.food?.name?.trim())
            .filter(Boolean)
        )
      );

    case 'restaurant':
      return meal.restaurant?.name ? [meal.restaurant.name.trim()] : [];

    case 'rating':
      return meal.rating ? [meal.rating.trim()] : [];

    case 'decade':
      if (meal.year) {
        const dec = Math.floor(meal.year / 10) * 10;
        return [`${dec}s`];
      }
      return [];

    default:
      return [];
  }
}

/**
 * Extracts all unique options with their total meal counts for a category,
 * sorted by frequency descending.
 */
export function extractCategoryOptions(meals, categoryKey) {
  if (!Array.isArray(meals)) return [];
  const countMap = new Map();

  for (const meal of meals) {
    const vals = getMealCategoryValues(meal, categoryKey);
    for (const v of vals) {
      countMap.set(v, (countMap.get(v) || 0) + 1);
    }
  }

  const result = [];
  for (const [name, count] of countMap.entries()) {
    result.push({ name, count });
  }

  // Sort descending by count, then alphabetical
  result.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.name.localeCompare(b.name);
  });

  return result;
}

/**
 * Computes the bipartite flow matrix between selected left items and right items.
 */
export function computeRelationshipsFlow(
  meals = [],
  leftCategory,
  selectedLeftItems = [],
  rightCategory,
  selectedRightItems = []
) {
  const leftSet = new Set(selectedLeftItems);
  const rightSet = new Set(selectedRightItems);

  const matrix = {};
  const leftTotals = {};
  const rightTotals = {};
  const mealSets = {}; // Track unique meal IDs for each link

  let totalFlow = 0;

  for (const meal of meals) {
    const leftVals = getMealCategoryValues(meal, leftCategory);
    const rightVals = getMealCategoryValues(meal, rightCategory);

    for (const lv of leftVals) {
      if (!leftSet.has(lv)) continue;

      for (const rv of rightVals) {
        if (!rightSet.has(rv)) continue;

        // Skip self-pairs if comparing same category (e.g. People -> People)
        if (leftCategory === rightCategory && lv === rv) continue;

        if (!matrix[lv]) matrix[lv] = {};
        matrix[lv][rv] = (matrix[lv][rv] || 0) + 1;

        leftTotals[lv] = (leftTotals[lv] || 0) + 1;
        rightTotals[rv] = (rightTotals[rv] || 0) + 1;

        const linkKey = `${lv}__$$__${rv}`;
        if (!mealSets[linkKey]) mealSets[linkKey] = new Set();
        if (meal.id) mealSets[linkKey].add(meal.id);

        totalFlow++;
      }
    }
  }

  const links = [];
  for (const [source, targets] of Object.entries(matrix)) {
    for (const [target, value] of Object.entries(targets)) {
      if (value > 0) {
        const linkKey = `${source}__$$__${target}`;
        links.push({
          source,
          target,
          value,
          mealIds: Array.from(mealSets[linkKey] || []),
        });
      }
    }
  }

  // Sort links by value descending
  links.sort((a, b) => b.value - a.value);

  // Active nodes (only those with > 0 flow)
  const activeLeft = selectedLeftItems
    .filter((name) => (leftTotals[name] || 0) > 0)
    .map((name) => ({ name, value: leftTotals[name] }));

  const activeRight = selectedRightItems
    .filter((name) => (rightTotals[name] || 0) > 0)
    .map((name) => ({ name, value: rightTotals[name] }));

  return {
    matrix,
    leftTotals,
    rightTotals,
    links,
    activeLeft,
    activeRight,
    totalFlow,
  };
}

/**
 * Sorts an array of nodes ({ name, value }) according to sortOption:
 * - 'count_desc': count high to low
 * - 'count_asc': count low to high
 * - 'name_asc': name A to Z
 * - 'name_desc': name Z to A
 */
export function sortNodes(nodes, sortOption = 'count_desc') {
  if (!Array.isArray(nodes)) return [];
  const copy = [...nodes];
  switch (sortOption) {
    case 'count_desc':
      return copy.sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
    case 'count_asc':
      return copy.sort((a, b) => a.value - b.value || a.name.localeCompare(b.name));
    case 'name_asc':
      return copy.sort((a, b) => a.name.localeCompare(b.name) || b.value - a.value);
    case 'name_desc':
      return copy.sort((a, b) => b.name.localeCompare(a.name) || b.value - a.value);
    default:
      return copy;
  }
}

/**
 * Maps a single category key and value to Chronicle filter state properties.
 */
export function convertCategoryToFilter(categoryKey, value, meals = []) {
  if (!value) return {};
  switch (categoryKey) {
    case 'people':
      return { people: [value] };
    case 'cuisine':
      return { cuisines: [value] };
    case 'country':
      return { countries: [value] };
    case 'city':
      return { cities: [value] };
    case 'dishType':
      return { foodTypes: [value] };
    case 'rating':
      return { ratings: [value] };
    case 'decade':
      return { decades: [value] };
    case 'restaurant': {
      const match = (meals || []).find((m) => m.restaurant?.name === value);
      if (match?.restaurant?.id) {
        return { restaurantId: match.restaurant.id, restaurantName: value };
      }
      return { search: value };
    }
    case 'food':
      return { search: value };
    default:
      return {};
  }
}

/**
 * Builds a combined multi-filter object for Chronicle navigation incorporating
 * BOTH the left dimension and right dimension selections.
 */
export function buildCombinedChronicleFilter(
  leftCategoryKey,
  leftValue,
  rightCategoryKey,
  rightValue,
  meals = []
) {
  const fLeft = convertCategoryToFilter(leftCategoryKey, leftValue, meals);
  const fRight = convertCategoryToFilter(rightCategoryKey, rightValue, meals);

  const combined = { ...fLeft };

  for (const [key, val] of Object.entries(fRight)) {
    if (combined[key] && Array.isArray(combined[key]) && Array.isArray(val)) {
      // Merge unique array items if both dimensions map to the same facet (e.g. people -> people)
      combined[key] = Array.from(new Set([...combined[key], ...val]));
    } else {
      combined[key] = val;
    }
  }

  return combined;
}

/**
 * Generates an SVG cubic bezier ribbon path between two vertical segments.
 *
 * (x0, y0_top) ─────── C ───────> (x1, y1_top)
 *      │                                │
 * (x0, y0_bottom) <─── C ──────── (x1, y1_bottom)
 */
export function createRibbonPath(x0, y0_top, y0_bottom, x1, y1_top, y1_bottom) {
  const dx = (x1 - x0) * 0.5;
  return `M ${x0.toFixed(1)},${y0_top.toFixed(1)} C ${(x0 + dx).toFixed(1)},${y0_top.toFixed(1)} ${(x1 - dx).toFixed(1)},${y1_top.toFixed(1)} ${x1.toFixed(1)},${y1_top.toFixed(1)} L ${x1.toFixed(1)},${y1_bottom.toFixed(1)} C ${(x1 - dx).toFixed(1)},${y1_bottom.toFixed(1)} ${(x0 + dx).toFixed(1)},${y0_bottom.toFixed(1)} ${x0.toFixed(1)},${y0_bottom.toFixed(1)} Z`;
}

/**
 * Computes coordinates and layout positions for nodes and ribbons in a Sankey diagram.
 */
export function computeSankeyLayout(flow, options = {}) {
  const {
    width = 960,
    height = 560,
    paddingTop = 24,
    paddingBottom = 24,
    paddingLeft = 16,
    paddingRight = 16,
    nodeWidth = 18,
    nodeGap = 12,
    minNodeHeight = 16,
    leftSortOption = 'count_desc',
    rightSortOption = 'count_desc',
  } = options;

  const { activeLeft, activeRight, links } = flow;

  if (activeLeft.length === 0 || activeRight.length === 0 || links.length === 0) {
    return {
      leftNodes: [],
      rightNodes: [],
      ribbons: [],
      width,
      height,
    };
  }

  // Sort nodes according to specified column sort preferences
  const sortedLeft = sortNodes(activeLeft, leftSortOption);
  const sortedRight = sortNodes(activeRight, rightSortOption);

  // 1. Position Left Nodes
  const totalLeftVal = sortedLeft.reduce((acc, n) => acc + n.value, 0) || 1;
  const nL = sortedLeft.length;
  const totalLeftGap = (nL - 1) * nodeGap;
  const availableLeftHeight = Math.max(100, height - paddingTop - paddingBottom - totalLeftGap);

  let currentY = paddingTop;
  const leftNodesMap = new Map();
  const leftNodes = sortedLeft.map((node) => {
    const rawH = (node.value / totalLeftVal) * availableLeftHeight;
    const h = Math.max(minNodeHeight, rawH);
    const nodeObj = {
      side: 'left',
      name: node.name,
      value: node.value,
      x0: paddingLeft,
      x1: paddingLeft + nodeWidth,
      y0: currentY,
      y1: currentY + h,
      height: h,
    };
    currentY += h + nodeGap;
    leftNodesMap.set(node.name, nodeObj);
    return nodeObj;
  });

  // 2. Position Right Nodes
  const totalRightVal = sortedRight.reduce((acc, n) => acc + n.value, 0) || 1;
  const nR = sortedRight.length;
  const totalRightGap = (nR - 1) * nodeGap;
  const availableRightHeight = Math.max(100, height - paddingTop - paddingBottom - totalRightGap);

  let currentYRight = paddingTop;
  const rightNodesMap = new Map();
  const rightNodes = sortedRight.map((node) => {
    const rawH = (node.value / totalRightVal) * availableRightHeight;
    const h = Math.max(minNodeHeight, rawH);
    const nodeObj = {
      side: 'right',
      name: node.name,
      value: node.value,
      x0: width - paddingRight - nodeWidth,
      x1: width - paddingRight,
      y0: currentYRight,
      y1: currentYRight + h,
      height: h,
    };
    currentYRight += h + nodeGap;
    rightNodesMap.set(node.name, nodeObj);
    return nodeObj;
  });

  // 3. Compute Ribbons
  // Group links by source and sort by target y position to prevent ribbon tangles
  const linksBySource = new Map();
  for (const link of links) {
    if (!linksBySource.has(link.source)) linksBySource.set(link.source, []);
    linksBySource.get(link.source).push(link);
  }

  for (const [, list] of linksBySource) {
    list.sort((a, b) => {
      const targetA = rightNodesMap.get(a.target)?.y0 || 0;
      const targetB = rightNodesMap.get(b.target)?.y0 || 0;
      return targetA - targetB;
    });
  }

  // Group links by target and sort by source y position
  const linksByTarget = new Map();
  for (const link of links) {
    if (!linksByTarget.has(link.target)) linksByTarget.set(link.target, []);
    linksByTarget.get(link.target).push(link);
  }

  for (const [, list] of linksByTarget) {
    list.sort((a, b) => {
      const sourceA = leftNodesMap.get(a.source)?.y0 || 0;
      const sourceB = leftNodesMap.get(b.source)?.y0 || 0;
      return sourceA - sourceB;
    });
  }

  // Allocate starting heights on left
  const leftSourceY = new Map();
  for (const [source, list] of linksBySource) {
    const sourceNode = leftNodesMap.get(source);
    if (!sourceNode) continue;
    let y = sourceNode.y0;
    for (const link of list) {
      const thickness = (link.value / sourceNode.value) * sourceNode.height;
      leftSourceY.set(`${link.source}__${link.target}`, { y0: y, y1: y + thickness });
      y += thickness;
    }
  }

  // Allocate arriving heights on right
  const rightTargetY = new Map();
  for (const [target, list] of linksByTarget) {
    const targetNode = rightNodesMap.get(target);
    if (!targetNode) continue;
    let y = targetNode.y0;
    for (const link of list) {
      const thickness = (link.value / targetNode.value) * targetNode.height;
      rightTargetY.set(`${link.source}__${link.target}`, { y0: y, y1: y + thickness });
      y += thickness;
    }
  }

  // Generate ribbon paths
  const ribbons = links.map((link) => {
    const key = `${link.source}__${link.target}`;
    const leftY = leftSourceY.get(key) || { y0: 0, y1: 0 };
    const rightY = rightTargetY.get(key) || { y0: 0, y1: 0 };
    const leftNode = leftNodesMap.get(link.source);
    const rightNode = rightNodesMap.get(link.target);

    const x0 = leftNode ? leftNode.x1 : 0;
    const x1 = rightNode ? rightNode.x0 : width;

    const path = createRibbonPath(x0, leftY.y0, leftY.y1, x1, rightY.y0, rightY.y1);

    return {
      source: link.source,
      target: link.target,
      value: link.value,
      mealIds: link.mealIds,
      path,
      leftY,
      rightY,
      leftNode,
      rightNode,
    };
  });

  return {
    leftNodes,
    rightNodes,
    ribbons,
    width,
    height: Math.max(height, currentY + paddingBottom, currentYRight + paddingBottom),
  };
}
