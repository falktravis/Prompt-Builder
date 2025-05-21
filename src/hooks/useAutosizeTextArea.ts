/**
 * useAutosizeTextArea.ts
 *
 * This custom React hook automatically adjusts the height of a textarea element
 * to fit its content. It is designed to be used with textareas that have
 * CSS properties 'overflow' set to 'hidden' and 'resize' set to 'none'
 * for optimal behavior.
 */
import { useLayoutEffect } from 'react';

/**
 * Adjusts the height of a textarea element to fit its content.
 *
 * @param textAreaRef - A React ref object (React.RefObject<HTMLTextAreaElement | null>)
 *                      pointing to the textarea DOM element whose height needs to be adjusted.
 *                      The ref can initially be null.
 * @param value - A string representing the current content of the textarea.
 *                The effect hook uses this value as a dependency, so the height
 *                recalculation is triggered whenever the content changes.
 * @param isOpen - A boolean indicating whether the textarea is currently visible/open.
 *                 The height adjustment will only occur if isOpen is true.
 *                 This is used to trigger recalculation when a section becomes visible.
 */
const useAutosizeTextArea = (
  textAreaRef: React.RefObject<HTMLTextAreaElement | null>, // Allow null in type
  value: string,
  isOpen: boolean // Added isOpen parameter
): void => {
  useLayoutEffect(() => {
    // Check if the textarea ref is currently pointing to an element and if it's open
    if (textAreaRef.current && isOpen) {
      // Temporarily reset the height to 'auto'.
      // This allows the browser to calculate the natural scrollHeight of the content
      // without being constrained by a previously set explicit height.
      textAreaRef.current.style.height = 'auto';

      // Set the textarea's height to its scrollHeight.
      // scrollHeight includes the content that is not visible due to overflow,
      // effectively making the textarea tall enough to display all its content.
      textAreaRef.current.style.height = `${textAreaRef.current.scrollHeight}px`;
    }
  }, [textAreaRef, value, isOpen]); // Dependencies: Re-run effect if ref, value, or isOpen changes.
};

export default useAutosizeTextArea;
