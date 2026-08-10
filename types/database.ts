/**
 * Typed shape of the Luna Music Supabase schema (ADR 4).
 * Keep in sync with supabase/migrations/20260810000000_luna_schema.sql.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string | null;
          display_name: string | null;
          avatar_art: string;
          plan: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username?: string | null;
          display_name?: string | null;
          avatar_art?: string;
          plan?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string | null;
          display_name?: string | null;
          avatar_art?: string;
          plan?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tracks: {
        Row: {
          id: string;
          title: string;
          artist: string;
          duration: number;
          art_key: string;
          artwork_url: string | null;
          preview_url: string | null;
          label: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          title: string;
          artist: string;
          duration?: number;
          art_key?: string;
          artwork_url?: string | null;
          preview_url?: string | null;
          label?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          artist?: string;
          duration?: number;
          art_key?: string;
          artwork_url?: string | null;
          preview_url?: string | null;
          label?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      playlists: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          art_key: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          art_key?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          art_key?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'playlists_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      playlist_tracks: {
        Row: {
          playlist_id: string;
          track_id: string;
          position: number;
          added_at: string;
        };
        Insert: {
          playlist_id: string;
          track_id: string;
          position?: number;
          added_at?: string;
        };
        Update: {
          playlist_id?: string;
          track_id?: string;
          position?: number;
          added_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'playlist_tracks_playlist_id_fkey';
            columns: ['playlist_id'];
            isOneToOne: false;
            referencedRelation: 'playlists';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'playlist_tracks_track_id_fkey';
            columns: ['track_id'];
            isOneToOne: false;
            referencedRelation: 'tracks';
            referencedColumns: ['id'];
          },
        ];
      };
      favorites: {
        Row: {
          user_id: string;
          track_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          track_id: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          track_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'favorites_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'favorites_track_id_fkey';
            columns: ['track_id'];
            isOneToOne: false;
            referencedRelation: 'tracks';
            referencedColumns: ['id'];
          },
        ];
      };
      recently_played: {
        Row: {
          id: string;
          user_id: string;
          track_id: string;
          played_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          track_id: string;
          played_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          track_id?: string;
          played_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'recently_played_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'recently_played_track_id_fkey';
            columns: ['track_id'];
            isOneToOne: false;
            referencedRelation: 'tracks';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type TrackRow = Database['public']['Tables']['tracks']['Row'];
export type PlaylistRow = Database['public']['Tables']['playlists']['Row'];
export type FavoriteRow = Database['public']['Tables']['favorites']['Row'];
export type RecentlyPlayedRow = Database['public']['Tables']['recently_played']['Row'];
