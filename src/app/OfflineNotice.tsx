import { onlineManager } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import type { Role } from "../data/backend";

const subscribe = (onChange: () => void) => onlineManager.subscribe(onChange);
const isOnline = () => onlineManager.isOnline();

const text: Record<Role, string> = {
  creator: "Hors ligne. Continue comme d'habitude : ce que tu coches partira au retour du réseau.",
  coach: "Hors ligne. Tu vois le suivi tel qu'il était à ta dernière visite.",
};

/** Un bandeau discret tant que l'appareil n'a pas de réseau. */
export function OfflineNotice({ role }: { role: Role }) {
  const online = useSyncExternalStore(subscribe, isOnline);
  if (online) return null;

  return (
    <p
      role="status"
      className="well mx-auto mb-4 max-w-[620px] px-4 py-3 text-[14px] lg:max-w-[1180px]"
    >
      {text[role]}
    </p>
  );
}
