/** One node of GET /api/v1/subjects/{id}/topics. */
export interface TopicNode {
  id: number;
  parentId?: number;
  name: string;
  descriptionHtml?: string;
  sortOrder: number;
  /** Items directly in this topic. */
  itemCount: number;
  /** Items in this topic and all its subtopics. */
  totalItemCount: number;
  children: TopicNode[];
}

export interface Topic {
  id: number;
  subjectId: number;
  parentId?: number;
  name: string;
  descriptionHtml?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTopicRequest {
  subjectId: number;
  parentId: number | null;
  name: string;
  descriptionHtml?: string | null;
}

export interface ReplaceTopicRequest {
  name: string;
  descriptionHtml?: string | null;
  sortOrder?: number | null;
}

export interface MoveTopicRequest {
  parentId: number | null;
  sortOrder: number;
}

/** A topic flattened out of the tree, with its depth, for pickers. */
export interface TopicOption {
  id: number;
  name: string;
  depth: number;
  /** "Parent › Child" path, for labels. */
  path: string;
}

/** Flattens a topic tree depth-first, keeping sibling order. */
export function flattenTopics(nodes: readonly TopicNode[], depth = 0, parentPath = ''): TopicOption[] {
  return nodes.flatMap((node) => {
    const path = parentPath ? `${parentPath} › ${node.name}` : node.name;
    return [{ id: node.id, name: node.name, depth, path }, ...flattenTopics(node.children, depth + 1, path)];
  });
}

/** Ids of a node and all its descendants. */
export function subtreeIds(node: TopicNode): number[] {
  return [node.id, ...node.children.flatMap(subtreeIds)];
}

/** Finds a node anywhere in the tree. */
export function findTopicNode(nodes: readonly TopicNode[], topicId: number): TopicNode | null {
  for (const node of nodes) {
    if (node.id === topicId) {
      return node;
    }
    const found = findTopicNode(node.children, topicId);
    if (found) {
      return found;
    }
  }
  return null;
}
