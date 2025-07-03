export const SUMMARIZE_PROMPT =
  '使用4到8个字直接返回这句话的简要主题，语言与用户的首要语言一致，不要解释、不要标点、不要语气词、不要多余文本，不要加粗，如果没有主题，请直接返回“闲聊”'

export const REFERENCE_PROMPT =`Please answer the question based on the reference materials and use footnote format to cite your sources. Please ignore irrelevant reference materials. If the reference material is not relevant to the question, please answer the question based on your knowledge. The answer should be clearly structured and complete.

## Footnote Format:

1. **Footnote Markers**: Use the form of [^number] in the main text to mark footnotes, e.g., [^1].
2. **Footnote Content**: Define the specific content of footnotes at the end of the document using the form [^number]: footnote content
3. **Footnote Content**: Should be as concise as possible, with the title of the referenced content wrapped in the original link."

## My question is:

{question}

## Reference Materials:

{references}
`
