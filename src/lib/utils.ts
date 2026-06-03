type ClassValue = string | number | boolean | null | undefined | ClassValue[] | { [className: string]: boolean | null | undefined };

export function cn(...inputs: ClassValue[]) {
  return inputs
    .flatMap((input): string[] => {
      if (!input) {
        return [];
      }

      if (Array.isArray(input)) {
        return [cn(...input)];
      }

      if (typeof input === "object") {
        return Object.entries(input)
          .filter(([, enabled]) => enabled)
          .map(([className]) => className);
      }

      return [String(input)];
    })
    .filter(Boolean)
    .join(" ");
}
