export default function useFormatOptions(firstLevelIndex, secondLevelIndex) {
  const result = [];

  const topLevelOptions = window.variants.map((option) => {
    const optionCopy = { ...option };
    delete optionCopy.children;
    return optionCopy;
  });
  result.push(topLevelOptions);

  const secondLevelChildren = variants[firstLevelIndex]?.children;
  const secondLevelOptions = secondLevelChildren?.map((option) => {
    const optionCopy = { ...option };
    delete optionCopy.children;
    return optionCopy;
  });
  if (!secondLevelOptions || secondLevelOptions.length === 0) return result;
  result.push(secondLevelOptions);

  const nestedLevelOptions = secondLevelChildren[secondLevelIndex]?.children;
  if (!nestedLevelOptions || nestedLevelOptions.length === 0) return result;
  result.push(...nestedLevelOptions);

  return result;
}
