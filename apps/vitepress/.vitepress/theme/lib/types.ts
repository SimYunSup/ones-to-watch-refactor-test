// `<script setup>` compiles to a component's setup() function and cannot
// carry its own named exports (only defineProps/defineEmits type params) —
// shared prop shapes live here instead of inside the .vue files that use
// them, mirroring apps/kudzu/src/components/PostCard.tsx's PostCardData.
export interface PostCardData {
  id: string;
  title: string;
  date: string | null;
  coverUrl: string | null;
  /** Base-prefixed link to the post page, precomputed by the caller. */
  href: string;
}
