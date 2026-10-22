import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown } from 'lucide-react';

export type DropdownNavItem = {
  id: number;
  label: string;
  link?: string;
  subMenus?: {
    title: string;
    items: {
      label: string;
      description: string;
      icon: React.ElementType;
      link: string;
    }[];
  }[];
};

type Props = {
  navItems: DropdownNavItem[];
};

export function DropdownNavigation({ navItems }: Props) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [isHover, setIsHover] = useState<number | null>(null);
  const { pathname } = useLocation();

  const isItemActive = (navItem: DropdownNavItem) =>
    navItem.link === pathname ||
    !!navItem.subMenus?.some((sub) => sub.items.some((item) => item.link === pathname));

  const triggerClass = (active: boolean) =>
    `text-sm py-1.5 px-4 flex cursor-pointer group transition-colors duration-300 items-center justify-center gap-1 relative whitespace-nowrap ${
      active ? 'text-cyan-400 font-semibold' : 'text-muted-foreground hover:text-foreground'
    }`;

  return (
    <ul className="relative flex items-center space-x-0">
      {navItems.map((navItem) => {
        const active = isItemActive(navItem);
        const hoverBg = (isHover === navItem.id || openMenu === navItem.label) && (
          <motion.div
            layoutId="hover-bg"
            className="absolute inset-0 size-full bg-primary/10"
            style={{ borderRadius: 99 }}
          />
        );

        return (
          <li
            key={navItem.label}
            className="relative"
            onMouseEnter={() => setOpenMenu(navItem.label)}
            onMouseLeave={() => setOpenMenu(null)}
          >
            {navItem.subMenus ? (
              <button
                type="button"
                className={triggerClass(active)}
                onMouseEnter={() => setIsHover(navItem.id)}
                onMouseLeave={() => setIsHover(null)}
                onClick={() => setOpenMenu(openMenu === navItem.label ? null : navItem.label)}
                aria-expanded={openMenu === navItem.label}
              >
                <span className="relative z-10">{navItem.label}</span>
                <ChevronDown
                  className={`relative z-10 h-4 w-4 group-hover:rotate-180 duration-300 transition-transform ${
                    openMenu === navItem.label ? 'rotate-180' : ''
                  }`}
                />
                {hoverBg}
              </button>
            ) : (
              <Link
                to={navItem.link ?? '#'}
                className={triggerClass(active)}
                onMouseEnter={() => setIsHover(navItem.id)}
                onMouseLeave={() => setIsHover(null)}
              >
                <span className="relative z-10">{navItem.label}</span>
                {hoverBg}
              </Link>
            )}

            <AnimatePresence>
              {openMenu === navItem.label && navItem.subMenus && (
                <div className="w-auto absolute left-0 top-full pt-2 z-50">
                  <motion.div
                    className="bg-background border border-border p-4 w-max shadow-xl shadow-black/40"
                    style={{ borderRadius: 16 }}
                    layoutId="menu"
                  >
                    <div className="w-fit shrink-0 flex space-x-9 overflow-hidden">
                      {navItem.subMenus.map((sub) => (
                        <motion.div layout className="w-full" key={sub.title}>
                          <h3 className="mb-4 text-sm font-medium capitalize text-muted-foreground">
                            {sub.title}
                          </h3>
                          <ul className="space-y-6">
                            {sub.items.map((item) => {
                              const Icon = item.icon;
                              return (
                                <li key={item.label}>
                                  <Link
                                    to={item.link}
                                    onClick={() => setOpenMenu(null)}
                                    className="flex items-start space-x-3 group"
                                  >
                                    <div className="border border-border text-foreground rounded-md flex items-center justify-center size-9 shrink-0 group-hover:bg-accent group-hover:text-accent-foreground transition-colors duration-300">
                                      <Icon className="h-5 w-5 flex-none" />
                                    </div>
                                    <div className="leading-5 w-max">
                                      <p className="text-sm font-medium text-foreground shrink-0">
                                        {item.label}
                                      </p>
                                      <p className="text-xs text-muted-foreground shrink-0 group-hover:text-foreground transition-colors duration-300">
                                        {item.description}
                                      </p>
                                    </div>
                                  </Link>
                                </li>
                              );
                            })}
                          </ul>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </li>
        );
      })}
    </ul>
  );
}
