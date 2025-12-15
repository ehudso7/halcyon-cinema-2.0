/**
 * Canon Vault Manager
 * Handles all canon operations: CRUD, locking, versioning, conflict resolution
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { slugify, generateId } from '@/lib/utils';
import type {
  CanonContext,
  CanonCharacterContext,
  CanonLocationContext,
  CanonRuleContext,
  CanonEventContext,
  CanonThemeContext,
  CanonConflict,
  ConflictResolutionRequest,
} from '../types';
import type {
  CanonEntry,
  CanonEntryInsert,
  CanonEntryUpdate,
  CanonCharacter,
  CanonLocation,
  CanonRule,
  CanonEvent,
  CanonTheme,
  CanonEntityType,
  CanonLockStatus,
  ConflictResolution,
} from '@/types/database';

export class CanonManager {
  private supabase = createAdminClient();

  /**
   * Load full canon context for a project
   */
  async loadCanonContext(projectId: string): Promise<CanonContext> {
    const [characters, locations, rules, events, themes] = await Promise.all([
      this.loadCharacters(projectId),
      this.loadLocations(projectId),
      this.loadRules(projectId),
      this.loadEvents(projectId),
      this.loadThemes(projectId),
    ]);

    return { characters, locations, rules, events, themes };
  }

  /**
   * Load characters for canon context
   */
  private async loadCharacters(projectId: string): Promise<CanonCharacterContext[]> {
    const { data, error } = await this.supabase
      .from('canon_characters')
      .select(`
        id,
        name,
        personality,
        backstory,
        relationships,
        canon_entry:canon_entries!inner(description, lock_status, is_active)
      `)
      .eq('project_id', projectId)
      .eq('canon_entries.is_active', true);

    if (error || !data) return [];

    return data.map((char) => ({
      id: char.id,
      name: char.name,
      description: (char.canon_entry as { description: string | null }).description,
      personality: char.personality,
      backstory: char.backstory,
      relationships: char.relationships,
      locked: (char.canon_entry as { lock_status: string }).lock_status !== 'unlocked',
    }));
  }

  /**
   * Load locations for canon context
   */
  private async loadLocations(projectId: string): Promise<CanonLocationContext[]> {
    const { data, error } = await this.supabase
      .from('canon_locations')
      .select(`
        id,
        name,
        atmosphere,
        canon_entry:canon_entries!inner(description, lock_status, is_active)
      `)
      .eq('project_id', projectId)
      .eq('canon_entries.is_active', true);

    if (error || !data) return [];

    return data.map((loc) => ({
      id: loc.id,
      name: loc.name,
      description: (loc.canon_entry as { description: string | null }).description,
      atmosphere: loc.atmosphere,
      locked: (loc.canon_entry as { lock_status: string }).lock_status !== 'unlocked',
    }));
  }

  /**
   * Load rules for canon context
   */
  private async loadRules(projectId: string): Promise<CanonRuleContext[]> {
    const { data, error } = await this.supabase
      .from('canon_rules')
      .select(`
        id,
        name,
        constraints,
        priority,
        canon_entry:canon_entries!inner(description, lock_status, is_active)
      `)
      .eq('project_id', projectId)
      .eq('canon_entries.is_active', true)
      .order('priority', { ascending: false });

    if (error || !data) return [];

    return data.map((rule) => ({
      id: rule.id,
      name: rule.name,
      description: (rule.canon_entry as { description: string | null }).description,
      constraints: rule.constraints || [],
      priority: rule.priority,
      locked: (rule.canon_entry as { lock_status: string }).lock_status !== 'unlocked',
    }));
  }

  /**
   * Load events for canon context
   */
  private async loadEvents(projectId: string): Promise<CanonEventContext[]> {
    const { data, error } = await this.supabase
      .from('canon_events')
      .select(`
        id,
        name,
        story_date,
        consequences,
        canon_entry:canon_entries!inner(description, lock_status, is_active)
      `)
      .eq('project_id', projectId)
      .eq('canon_entries.is_active', true)
      .order('relative_order');

    if (error || !data) return [];

    return data.map((event) => ({
      id: event.id,
      name: event.name,
      description: (event.canon_entry as { description: string | null }).description,
      storyDate: event.story_date,
      consequences: event.consequences || [],
      locked: (event.canon_entry as { lock_status: string }).lock_status !== 'unlocked',
    }));
  }

  /**
   * Load themes for canon context
   */
  private async loadThemes(projectId: string): Promise<CanonThemeContext[]> {
    const { data, error } = await this.supabase
      .from('canon_themes')
      .select(`
        id,
        name,
        how_expressed,
        canon_entry:canon_entries!inner(description, lock_status, is_active)
      `)
      .eq('project_id', projectId)
      .eq('canon_entries.is_active', true);

    if (error || !data) return [];

    return data.map((theme) => ({
      id: theme.id,
      name: theme.name,
      description: (theme.canon_entry as { description: string | null }).description,
      howExpressed: theme.how_expressed,
      locked: (theme.canon_entry as { lock_status: string }).lock_status !== 'unlocked',
    }));
  }

  /**
   * Create a new canon entry
   */
  async createEntry(
    projectId: string,
    entityType: CanonEntityType,
    data: {
      name: string;
      description?: string;
      entityData: Record<string, unknown>;
    }
  ): Promise<{ entry: CanonEntry; entityId: string } | null> {
    const slug = slugify(data.name);

    // Start transaction-like operation
    const { data: entry, error: entryError } = await this.supabase
      .from('canon_entries')
      .insert({
        project_id: projectId,
        entity_type: entityType,
        name: data.name,
        slug,
        description: data.description,
        data: data.entityData,
      })
      .select()
      .single();

    if (entryError || !entry) {
      console.error('Failed to create canon entry:', entryError);
      return null;
    }

    // Create type-specific record
    const entityId = await this.createTypeSpecificRecord(
      entityType,
      projectId,
      entry.id,
      data.name,
      data.entityData
    );

    if (!entityId) {
      // Rollback entry creation
      await this.supabase.from('canon_entries').delete().eq('id', entry.id);
      return null;
    }

    // Create initial version
    await this.createVersion(entry.id, 1, data.name, data.description || null, data.entityData, null, 'Created');

    return { entry, entityId };
  }

  /**
   * Create type-specific canon record
   */
  private async createTypeSpecificRecord(
    entityType: CanonEntityType,
    projectId: string,
    canonEntryId: string,
    name: string,
    data: Record<string, unknown>
  ): Promise<string | null> {
    const baseRecord = {
      id: generateId(),
      canon_entry_id: canonEntryId,
      project_id: projectId,
      name,
    };

    let result;

    switch (entityType) {
      case 'character':
        result = await this.supabase
          .from('canon_characters')
          .insert({ ...baseRecord, ...data })
          .select('id')
          .single();
        break;
      case 'location':
        result = await this.supabase
          .from('canon_locations')
          .insert({ ...baseRecord, ...data })
          .select('id')
          .single();
        break;
      case 'rule':
        result = await this.supabase
          .from('canon_rules')
          .insert({ ...baseRecord, description: (data.description as string) || '', ...data })
          .select('id')
          .single();
        break;
      case 'event':
        result = await this.supabase
          .from('canon_events')
          .insert({ ...baseRecord, ...data })
          .select('id')
          .single();
        break;
      case 'theme':
        result = await this.supabase
          .from('canon_themes')
          .insert({ ...baseRecord, ...data })
          .select('id')
          .single();
        break;
      default:
        return null;
    }

    if (result.error || !result.data) {
      console.error(`Failed to create ${entityType}:`, result.error);
      return null;
    }

    return result.data.id;
  }

  /**
   * Update a canon entry
   */
  async updateEntry(
    entryId: string,
    updates: {
      name?: string;
      description?: string;
      entityData?: Record<string, unknown>;
    },
    userId?: string,
    reason?: string
  ): Promise<boolean> {
    // Get current entry for versioning
    const { data: currentEntry, error: fetchError } = await this.supabase
      .from('canon_entries')
      .select('*')
      .eq('id', entryId)
      .single();

    if (fetchError || !currentEntry) return false;

    // Check if locked
    if (currentEntry.lock_status === 'hard_locked') {
      console.error('Cannot update hard-locked canon entry');
      return false;
    }

    // Update canon entry
    const entryUpdates: CanonEntryUpdate = {};
    if (updates.name) {
      entryUpdates.name = updates.name;
      entryUpdates.slug = slugify(updates.name);
    }
    if (updates.description !== undefined) {
      entryUpdates.description = updates.description;
    }
    if (updates.entityData) {
      entryUpdates.data = updates.entityData;
    }
    entryUpdates.version = currentEntry.version + 1;

    const { error: updateError } = await this.supabase
      .from('canon_entries')
      .update(entryUpdates)
      .eq('id', entryId);

    if (updateError) return false;

    // Update type-specific record if entity data provided
    if (updates.entityData) {
      await this.updateTypeSpecificRecord(
        currentEntry.entity_type as CanonEntityType,
        entryId,
        updates.name || currentEntry.name,
        updates.entityData
      );
    }

    // Create version history
    await this.createVersion(
      entryId,
      currentEntry.version + 1,
      updates.name || currentEntry.name,
      updates.description ?? currentEntry.description,
      updates.entityData || currentEntry.data as Record<string, unknown>,
      userId || null,
      reason || 'Updated'
    );

    return true;
  }

  /**
   * Update type-specific record
   */
  private async updateTypeSpecificRecord(
    entityType: CanonEntityType,
    canonEntryId: string,
    name: string,
    data: Record<string, unknown>
  ): Promise<boolean> {
    const updates = { name, ...data };
    let result;

    switch (entityType) {
      case 'character':
        result = await this.supabase
          .from('canon_characters')
          .update(updates)
          .eq('canon_entry_id', canonEntryId);
        break;
      case 'location':
        result = await this.supabase
          .from('canon_locations')
          .update(updates)
          .eq('canon_entry_id', canonEntryId);
        break;
      case 'rule':
        result = await this.supabase
          .from('canon_rules')
          .update(updates)
          .eq('canon_entry_id', canonEntryId);
        break;
      case 'event':
        result = await this.supabase
          .from('canon_events')
          .update(updates)
          .eq('canon_entry_id', canonEntryId);
        break;
      case 'theme':
        result = await this.supabase
          .from('canon_themes')
          .update(updates)
          .eq('canon_entry_id', canonEntryId);
        break;
      default:
        return false;
    }

    return !result.error;
  }

  /**
   * Lock a canon entry
   */
  async lockEntry(
    entryId: string,
    lockStatus: CanonLockStatus,
    userId: string
  ): Promise<boolean> {
    const { error } = await this.supabase
      .from('canon_entries')
      .update({
        lock_status: lockStatus,
        locked_at: lockStatus !== 'unlocked' ? new Date().toISOString() : null,
        locked_by: lockStatus !== 'unlocked' ? userId : null,
      })
      .eq('id', entryId);

    return !error;
  }

  /**
   * Delete a canon entry (soft delete by marking inactive)
   */
  async deleteEntry(entryId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('canon_entries')
      .update({ is_active: false })
      .eq('id', entryId);

    return !error;
  }

  /**
   * Resolve a canon conflict
   */
  async resolveConflict(
    projectId: string,
    request: ConflictResolutionRequest,
    userId: string
  ): Promise<boolean> {
    switch (request.resolution) {
      case 'keep_canon':
        // No database changes needed - the generated content should be modified
        return true;

      case 'update_canon':
        if (!request.updatedCanonData) return false;
        return this.updateEntry(
          request.conflictId,
          { entityData: request.updatedCanonData as Record<string, unknown> },
          userId,
          'Canon updated via conflict resolution'
        );

      case 'fork_timeline':
        return this.forkTimeline(
          projectId,
          request.conflictId,
          request.timelineName || 'Alternate Timeline',
          request.timelineDescription || 'Created from conflict resolution',
          userId
        );

      default:
        return false;
    }
  }

  /**
   * Fork timeline for alternate canon
   */
  private async forkTimeline(
    projectId: string,
    forkPointCanonId: string,
    name: string,
    description: string,
    userId: string
  ): Promise<boolean> {
    // Get the event associated with this canon entry if any
    const { data: canonEntry } = await this.supabase
      .from('canon_entries')
      .select('*')
      .eq('id', forkPointCanonId)
      .single();

    if (!canonEntry) return false;

    // Create new timeline
    const { data: timeline, error: timelineError } = await this.supabase
      .from('timelines')
      .insert({
        project_id: projectId,
        name,
        description,
        is_main: false,
        parent_timeline_id: null, // Would need to find main timeline
      })
      .select()
      .single();

    if (timelineError || !timeline) return false;

    // Duplicate the conflicting canon entry with the new timeline
    const { error: duplicateError } = await this.supabase
      .from('canon_entries')
      .insert({
        ...canonEntry,
        id: generateId(),
        timeline_id: timeline.id,
        version: 1,
      });

    return !duplicateError;
  }

  /**
   * Create version history entry
   */
  private async createVersion(
    canonEntryId: string,
    version: number,
    name: string,
    description: string | null,
    data: Record<string, unknown>,
    userId: string | null,
    reason: string
  ): Promise<void> {
    await this.supabase.from('canon_versions').insert({
      canon_entry_id: canonEntryId,
      version,
      name,
      description,
      data,
      changed_by: userId,
      change_reason: reason,
      change_type: 'manual',
    });
  }

  /**
   * Get version history for an entry
   */
  async getVersionHistory(
    canonEntryId: string
  ): Promise<Array<{ version: number; name: string; createdAt: string; changeReason: string | null }>> {
    const { data, error } = await this.supabase
      .from('canon_versions')
      .select('version, name, created_at, change_reason')
      .eq('canon_entry_id', canonEntryId)
      .order('version', { ascending: false });

    if (error || !data) return [];

    return data.map((v) => ({
      version: v.version,
      name: v.name,
      createdAt: v.created_at,
      changeReason: v.change_reason,
    }));
  }

  /**
   * Restore entry to a previous version
   */
  async restoreVersion(canonEntryId: string, version: number, userId: string): Promise<boolean> {
    const { data: versionData, error: versionError } = await this.supabase
      .from('canon_versions')
      .select('*')
      .eq('canon_entry_id', canonEntryId)
      .eq('version', version)
      .single();

    if (versionError || !versionData) return false;

    return this.updateEntry(
      canonEntryId,
      {
        name: versionData.name,
        description: versionData.description,
        entityData: versionData.data as Record<string, unknown>,
      },
      userId,
      `Restored to version ${version}`
    );
  }

  /**
   * Search canon entries
   */
  async searchCanon(
    projectId: string,
    query: string,
    entityTypes?: CanonEntityType[]
  ): Promise<CanonEntry[]> {
    let queryBuilder = this.supabase
      .from('canon_entries')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_active', true)
      .textSearch('search_vector', query);

    if (entityTypes && entityTypes.length > 0) {
      queryBuilder = queryBuilder.in('entity_type', entityTypes);
    }

    const { data, error } = await queryBuilder.limit(50);

    if (error || !data) return [];

    return data;
  }
}

// Singleton instance
let canonManagerInstance: CanonManager | null = null;

export function getCanonManager(): CanonManager {
  if (!canonManagerInstance) {
    canonManagerInstance = new CanonManager();
  }
  return canonManagerInstance;
}
