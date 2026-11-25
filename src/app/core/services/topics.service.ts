import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CreateTopicRequest, MoveTopicRequest, ReplaceTopicRequest, Topic, TopicNode } from '../models/topic.models';

const TOPICS_URL = '/api/v1/topics';

@Injectable({ providedIn: 'root' })
export class TopicsService {
  private readonly http = inject(HttpClient);

  listTopicTree(subjectId: number): Observable<TopicNode[]> {
    return this.http.get<TopicNode[]>(`/api/v1/subjects/${subjectId}/topics`);
  }

  getTopic(topicId: number): Observable<Topic> {
    return this.http.get<Topic>(`${TOPICS_URL}/${topicId}`);
  }

  createTopic(request: CreateTopicRequest): Observable<Topic> {
    return this.http.post<Topic>(TOPICS_URL, request);
  }

  replaceTopic(topicId: number, request: ReplaceTopicRequest): Observable<Topic> {
    return this.http.put<Topic>(`${TOPICS_URL}/${topicId}`, request);
  }

  moveTopic(topicId: number, request: MoveTopicRequest): Observable<Topic> {
    return this.http.patch<Topic>(`${TOPICS_URL}/${topicId}/move`, request);
  }

  deleteTopic(topicId: number): Observable<void> {
    return this.http.delete<void>(`${TOPICS_URL}/${topicId}`);
  }
}
