import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
} from "react";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useReducedMotion,
} from "motion/react";
import {
  ChevronLeft,
  ChevronRight,
  File,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react";

import ThemeMenu from "./ThemeMenu";

export type Tab = {
  id: string;
  path: string;
  filename: string;
  folderPath?: string | null;
};

type Props = {
  tabs: Tab[];
  activeTabId: string | null;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onReorderTabs?: (fromIndex: number, toIndex: number) => void;
  hasFolder: boolean;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
};

const spring = {
  type: "spring" as const,
  stiffness: 460,
  damping: 36,
  mass: 0.8,
};

const toolBtn =
  "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] border-0 bg-transparent p-0 text-[var(--text-muted)] transition-[color,background,opacity] duration-[160ms] hover:enabled:bg-[var(--accent-hover)] hover:enabled:text-[var(--text-main)] data-[active=true]:bg-[var(--accent-hover)] data-[active=true]:text-[var(--text-main)] disabled:cursor-default disabled:opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent-blue)] focus-visible:outline-offset-[-3px]";

const sideGroup =
  "flex shrink-0 items-center gap-[2px] border-l border-[var(--border-main)] px-1";

export default function TabBar({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onReorderTabs,
  hasFolder,
  sidebarOpen,
  onToggleSidebar,
}: Props) {
  const instanceId = useId();
  const reduceMotion = useReducedMotion();

  const tabListRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef(new Map<string, HTMLButtonElement>());
  const draggedIdRef = useRef<string | null>(null);
  const pendingFocusRef = useRef<string | null>(null);

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [scrollState, setScrollState] = useState({
    left: false,
    right: false,
  });

  const transition = reduceMotion ? { duration: 0 } : spring;
  const hasActiveTab = tabs.some((tab) => tab.id === activeTabId);

  const updateScrollState = useCallback(() => {
    const element = tabListRef.current;
    if (!element) return;

    const left = element.scrollLeft > 2;
    const right =
      element.scrollLeft + element.clientWidth < element.scrollWidth - 2;

    setScrollState((previous) =>
      previous.left === left && previous.right === right
        ? previous
        : { left, right },
    );
  }, []);

  useEffect(() => {
    const element = tabListRef.current;
    if (!element) return;

    const observer = new ResizeObserver(updateScrollState);

    observer.observe(element);
    Array.from(element.children).forEach((child) => {
      observer.observe(child);
    });

    updateScrollState();

    return () => observer.disconnect();
  }, [tabs, updateScrollState]);

  const revealTab = useCallback(
    (id: string) => {
      const list = tabListRef.current;
      const button = tabRefs.current.get(id);
      const tab = button?.parentElement;

      if (!list || !tab) return;

      const viewport = list.getBoundingClientRect();
      const bounds = tab.getBoundingClientRect();
      const padding = 12;

      let distance = 0;

      if (bounds.left < viewport.left + padding) {
        distance = bounds.left - viewport.left - padding;
      } else if (bounds.right > viewport.right - padding) {
        distance = bounds.right - viewport.right + padding;
      }

      if (distance) {
        list.scrollBy({
          left: distance,
          behavior: reduceMotion ? "auto" : "smooth",
        });
      }
    },
    [reduceMotion],
  );

  const focusTab = useCallback(
    (id: string) => {
      tabRefs.current.get(id)?.focus({ preventScroll: true });
      revealTab(id);
    },
    [revealTab],
  );

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (activeTabId) revealTab(activeTabId);
    });

    return () => cancelAnimationFrame(frame);
  }, [activeTabId, tabs, revealTab]);

  useEffect(() => {
    const id = pendingFocusRef.current;
    if (!id) return;

    pendingFocusRef.current = null;

    if (tabs.some((tab) => tab.id === id)) {
      focusTab(id);
    }
  }, [tabs, focusTab]);

  const closeTab = useCallback(
    (index: number) => {
      const tab = tabs[index];
      if (!tab) return;

      const wrapper = tabRefs.current.get(tab.id)?.parentElement;
      const hadFocus = wrapper?.contains(document.activeElement);
      const nextTab = tabs[index + 1] ?? tabs[index - 1];

      if (hadFocus && nextTab) {
        pendingFocusRef.current = nextTab.id;

        // Evita que el foco quede en un elemento que está desapareciendo.
        focusTab(nextTab.id);
      }

      if (tab.id === activeTabId && nextTab) {
        onSelectTab(nextTab.id);
      }

      onCloseTab(tab.id);
    },
    [tabs, activeTabId, focusTab, onCloseTab, onSelectTab],
  );

  const handleKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    // Reordenación accesible sin depender del drag & drop.
    if (
      onReorderTabs &&
      event.altKey &&
      event.shiftKey &&
      (event.key === "ArrowLeft" || event.key === "ArrowRight")
    ) {
      event.preventDefault();

      const direction = event.key === "ArrowRight" ? 1 : -1;
      const target = index + direction;

      if (target >= 0 && target < tabs.length) {
        pendingFocusRef.current = tabs[index].id;
        onReorderTabs(index, target);
      }

      return;
    }

    let target = -1;

    switch (event.key) {
      case "ArrowRight":
        target = (index + 1) % tabs.length;
        break;
      case "ArrowLeft":
        target = (index - 1 + tabs.length) % tabs.length;
        break;
      case "Home":
        target = 0;
        break;
      case "End":
        target = tabs.length - 1;
        break;
      case "Delete":
        event.preventDefault();
        closeTab(index);
        return;
      default:
        return;
    }

    event.preventDefault();
    onSelectTab(tabs[target].id);
    focusTab(tabs[target].id);
  };

  const resetDrag = () => {
    draggedIdRef.current = null;
    setDraggedId(null);
    setDropTargetId(null);
  };

  const handleDragStart = (
    event: DragEvent<HTMLDivElement>,
    id: string,
  ) => {
    if (!onReorderTabs) {
      event.preventDefault();
      return;
    }

    draggedIdRef.current = id;
    setDraggedId(id);

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", id);
  };

  const handleDrop = (
    event: DragEvent<HTMLDivElement>,
    targetId: string,
  ) => {
    const sourceId = draggedIdRef.current;
    if (!sourceId || !onReorderTabs) return;

    event.preventDefault();

    const fromIndex = tabs.findIndex((tab) => tab.id === sourceId);
    const toIndex = tabs.findIndex((tab) => tab.id === targetId);

    if (fromIndex >= 0 && toIndex >= 0 && fromIndex !== toIndex) {
      onReorderTabs(fromIndex, toIndex);
    }

    resetDrag();
  };

  const scrollTabs = (direction: number) => {
    const element = tabListRef.current;
    if (!element) return;

    element.scrollBy({
      left: direction * Math.max(160, element.clientWidth * 0.65),
      behavior: reduceMotion ? "auto" : "smooth",
    });
  };

  const draggedIndex = tabs.findIndex((tab) => tab.id === draggedId);

  return (
    <MotionConfig reducedMotion="user">
      <style>{`@keyframes premium-tab-shine{0%{opacity:0;transform:translateX(-110%)}25%{opacity:.65}100%{opacity:0;transform:translateX(110%)}}`}</style>
      <div className="flex h-10 w-full min-w-0 select-none items-stretch border-b border-[var(--border-main)] bg-[var(--bg-sidebar)] pr-1.5 motion-reduce:[&_*]:animate-none motion-reduce:[&_*]:transition-none">
        <AnimatePresence initial={false}>
          {hasFolder && (
            <motion.div
              className="flex shrink-0 items-center justify-center overflow-hidden border-r border-[var(--border-main)]"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 42, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={transition}
            >
              <motion.button
                type="button"
                onClick={onToggleSidebar}
                aria-label={sidebarOpen ? "Cerrar panel lateral" : "Abrir panel lateral"}
                aria-expanded={sidebarOpen}
                title={sidebarOpen ? "Cerrar panel lateral" : "Abrir panel lateral"}
                className={toolBtn}
                data-active={sidebarOpen}
                whileHover={reduceMotion ? undefined : { scale: 1.06 }}
                whileTap={reduceMotion ? undefined : { scale: 0.9 }}
              >
                <motion.span
                  animate={{ rotate: sidebarOpen ? 0 : 180 }}
                  transition={transition}
                  className="flex"
                >
                  {sidebarOpen ? (
                    <PanelLeftClose size={16} />
                  ) : (
                    <PanelLeftOpen
                      size={16}
                      style={{ transform: "rotate(180deg)" }}
                    />
                  )}
                </motion.span>
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        <div
          className="relative min-w-0 flex-1 overflow-hidden before:pointer-events-none before:absolute before:bottom-0 before:left-0 before:top-0 before:z-[5] before:w-5 before:bg-gradient-to-r before:from-[var(--bg-sidebar)] before:to-transparent before:opacity-0 before:transition-opacity before:duration-[180ms] before:content-[''] after:pointer-events-none after:absolute after:bottom-0 after:right-0 after:top-0 after:z-[5] after:w-5 after:bg-gradient-to-l after:from-[var(--bg-sidebar)] after:to-transparent after:opacity-0 after:transition-opacity after:duration-[180ms] after:content-[''] data-[overflow-left=true]:before:opacity-100 data-[overflow-right=true]:after:opacity-100"
          data-overflow-left={scrollState.left}
          data-overflow-right={scrollState.right}
        >
          <div
            ref={tabListRef}
            role="tablist"
            aria-label="Archivos abiertos"
            aria-orientation="horizontal"
            className="relative flex h-full min-w-0 items-stretch overflow-y-hidden overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            onScroll={updateScrollState}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                setDropTargetId(null);
              }
            }}
          >
            <AnimatePresence initial={false} mode="popLayout">
              {tabs.map((tab, index) => {
                const isActive = tab.id === activeTabId;
                const isDragging = tab.id === draggedId;
                const isDropTarget =
                  tab.id === dropTargetId && tab.id !== draggedId;

                return (
                  <motion.div
                    layout="position"
                    key={tab.id}
                    role="presentation"
                    className="group relative isolate flex max-w-[240px] min-w-[108px] flex-none items-center border-r border-[var(--border-main)] pr-[7px] text-[var(--text-muted)] transition-colors duration-[160ms] hover:text-[var(--text-main)] data-[active=true]:text-[var(--text-main)] data-[dragging=true]:cursor-grabbing before:absolute before:inset-1 before:z-[-1] before:scale-[0.96] before:rounded-md before:bg-[var(--accent-hover)] before:opacity-0 before:transition before:duration-[180ms] before:content-[''] data-[active=false]:hover:before:scale-100 data-[active=false]:hover:before:opacity-100"
                    data-active={isActive}
                    data-dragging={isDragging}
                    draggable={Boolean(onReorderTabs)}
                    onDragStart={(event) =>
                      handleDragStart(
                        event as unknown as DragEvent<HTMLDivElement>,
                        tab.id,
                      )
                    }
                    onDragOver={(event) => {
                      if (!draggedIdRef.current || !onReorderTabs) return;

                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                      setDropTargetId(tab.id);
                    }}
                    onDrop={(event) => handleDrop(event, tab.id)}
                    onDragEnd={resetDrag}
                    onAuxClick={(event) => {
                      if (event.button === 1) {
                        event.preventDefault();
                        closeTab(index);
                      }
                    }}
                    initial={{
                      opacity: 0,
                      y: reduceMotion ? 0 : 10,
                      scale: reduceMotion ? 1 : 0.94,
                    }}
                    animate={{
                      opacity: isDragging ? 0.4 : 1,
                      y: 0,
                      scale: 1,
                    }}
                    exit={{
                      opacity: 0,
                      y: reduceMotion ? 0 : -8,
                      scale: reduceMotion ? 1 : 0.94,
                      transition: { duration: reduceMotion ? 0 : 0.16 },
                    }}
                    transition={transition}
                    onLayoutAnimationComplete={updateScrollState}
                  >
                    {isActive && (
                      <motion.div
                        layoutId={`${instanceId}-active-surface`}
                        className="pointer-events-none absolute inset-0 z-[-1] overflow-hidden bg-[var(--bg-editor)]"
                        transition={transition}
                        aria-hidden="true"
                      >
                        <span className="absolute inset-0 -translate-x-[110%] bg-[linear-gradient(110deg,transparent_20%,var(--accent-hover)_50%,transparent_80%)] opacity-0 group-hover:animate-[premium-tab-shine_700ms_ease-out]" />
                      </motion.div>
                    )}

                    <button
                      ref={(element) => {
                        if (element) {
                          tabRefs.current.set(tab.id, element);
                        } else {
                          tabRefs.current.delete(tab.id);
                        }
                      }}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      aria-keyshortcuts={
                        onReorderTabs
                          ? "Delete Alt+Shift+ArrowLeft Alt+Shift+ArrowRight"
                          : "Delete"
                      }
                      tabIndex={isActive || (!hasActiveTab && index === 0) ? 0 : -1}
                      title={tab.path || tab.filename}
                      className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 self-stretch border-0 bg-transparent py-0 pl-[13px] pr-[9px] text-[13px] text-inherit focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent-blue)] focus-visible:outline-offset-[-3px]"
                      onClick={() => onSelectTab(tab.id)}
                      onKeyDown={(event) => handleKeyDown(event, index)}
                    >
                      <motion.span
                        className="flex shrink-0"
                        animate={{
                          y: isActive && !reduceMotion ? -1 : 0,
                          rotate: isActive && !reduceMotion ? -6 : 0,
                          scale: isActive && !reduceMotion ? 1.08 : 1,
                        }}
                        transition={transition}
                      >
                        <File size={14} aria-hidden="true" />
                      </motion.span>

                      <span className="max-w-[160px] overflow-hidden text-ellipsis whitespace-nowrap">
                        {tab.filename}
                      </span>
                    </button>

                    <motion.button
                      type="button"
                      className="inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent p-0 text-[var(--text-muted)] opacity-0 transition duration-150 hover:bg-[var(--accent-hover)] hover:text-[var(--text-main)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent-blue)] focus-visible:outline-offset-[-3px] group-focus-within:opacity-100 group-hover:opacity-100 group-data-[active=true]:opacity-100 [@media(hover:none)]:opacity-100"
                      aria-label={`Cerrar ${tab.filename}`}
                      title={`Cerrar ${tab.filename}`}
                      draggable={false}
                      onDragStart={(event) => event.preventDefault()}
                      onClick={() => closeTab(index)}
                      whileHover={
                        reduceMotion ? undefined : { rotate: 90, scale: 1.1 }
                      }
                      whileTap={reduceMotion ? undefined : { scale: 0.8 }}
                    >
                      <X size={13} aria-hidden="true" />
                    </motion.button>

                    {isActive && (
                      <motion.div
                        layoutId={`${instanceId}-active-line`}
                        className="pointer-events-none absolute inset-x-[10px] bottom-0 h-[2px] rounded-t-full bg-[var(--accent-blue)]"
                        transition={transition}
                        aria-hidden="true"
                      />
                    )}

                    {isDropTarget && (
                      <div
                        className={`pointer-events-none absolute bottom-[7px] top-[7px] z-[6] w-[2px] rounded-full bg-[var(--accent-blue)] ${draggedIndex < index ? "right-0" : "left-0"}`}
                        aria-hidden="true"
                      />
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {(scrollState.left || scrollState.right) && (
          <div className={sideGroup}>
            <button
              type="button"
              className={toolBtn}
              aria-label="Desplazar pestañas a la izquierda"
              disabled={!scrollState.left}
              onClick={() => scrollTabs(-1)}
            >
              <ChevronLeft size={15} />
            </button>

            <button
              type="button"
              className={toolBtn}
              aria-label="Desplazar pestañas a la derecha"
              disabled={!scrollState.right}
              onClick={() => scrollTabs(1)}
            >
              <ChevronRight size={15} />
            </button>
          </div>
        )}

        <div className={sideGroup}>
          <ThemeMenu />
        </div>
      </div>
    </MotionConfig>
  );
}
