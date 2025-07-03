import React, { useEffect, useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import RemarkMath from "remark-math";
import RemarkBreaks from "remark-breaks";
import RehypeKatex from "rehype-katex";
import rehypeHighlight from 'rehype-highlight';
import CodeBlock from '@/app/components/CodeBlock';
import FileCard from '@/app/components/artifact/FileCard';
import 'highlight.js/styles/github.css';
import "katex/dist/katex.min.css";
import 'github-markdown-css/github-markdown-light.css';
import crypto from 'crypto';

const MarkdownRender = (props: {
  content: string,
}
) => {
  const [processedContent, setProcessedContent] = useState(props.content);
  const [svgBlocks, setSvgBlocks] = useState<{ id: string, content: string }[]>([]);
  const [htmlBlocks, setHtmlBlocks] = useState<{ id: string, content: string }[]>([]);

  // 处理括号转义
  function escapeBrackets(text: string) {
    const pattern =
      /(```[\s\S]*?```|`.*?`)|\\\[([\s\S]*?[^\\])\\\]|\\\((.*?)\\\)/g;
    return text.replace(
      pattern,
      (match, codeBlock, squareBracket, roundBracket) => {
        if (codeBlock) {
          return codeBlock;
        } else if (squareBracket) {
          return `$$${squareBracket}$$`;
        } else if (roundBracket) {
          return `$${roundBracket}$`;
        }
        return match;
      },
    );
  }

  // 生成基于内容的哈希 ID
  const generateContentBasedId = (content: string, prefix: string = 'svg'): string => {
    // 使用 MD5 哈希算法生成基于内容的哈希值
    // MD5 足够快速且碰撞概率低，适合此用例
    return `${prefix}-${crypto.createHash('md5').update(content).digest('hex').substring(0, 10)}`;
  };

  // 预处理内容，提取 SVG 和 HTML 代码块
  useEffect(() => {
    const escaped = escapeBrackets(props.content);

    // 匹配 SVG 代码块
    const svgBlockRegex = /```(?:xml|svg)?\s*(<svg[\s\S]*?<\/svg>)\s*```/g;
    const svgMatches = [...escaped.matchAll(svgBlockRegex)];

    // 提取 SVG 内容并生成基于内容的唯一 ID
    const extractedSvgBlocks = svgMatches.map(match => {
      const svgContent = match[1];
      // 使用基于内容的哈希值作为 ID，确保相同内容始终获得相同的 ID
      const id = generateContentBasedId(svgContent, 'svg');
      return { id, content: svgContent };
    });

    setSvgBlocks(extractedSvgBlocks);

    // 匹配 HTML 代码块 (排除已经匹配的 SVG 代码块)
    const htmlBlockRegex = /```(?:html)?\s*(<(?!svg)[\s\S]*?>[\s\S]*?<\/[\s\S]*?>)\s*```/g;
    const htmlMatches = [...escaped.matchAll(htmlBlockRegex)];

    // 提取 HTML 内容并生成基于内容的唯一 ID
    const extractedHtmlBlocks = htmlMatches.map(match => {
      const htmlContent = match[1];
      // 使用基于内容的哈希值作为 ID，确保相同内容始终获得相同的 ID
      const id = generateContentBasedId(htmlContent, 'html');
      return { id, content: htmlContent };
    });

    setHtmlBlocks(extractedHtmlBlocks);

    // 替换 SVG 代码块为特殊格式的代码块
    let processed = escaped;
    extractedSvgBlocks.forEach(block => {
      const regex = new RegExp(`\`\`\`(?:xml|svg)?\\s*(${block.content.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\s*\`\`\``, 'g');
      processed = processed.replace(regex, `\`\`\`svg-card-${block.id}\n${block.content}\n\`\`\``);
    });

    // 替换 HTML 代码块为特殊格式的代码块
    extractedHtmlBlocks.forEach(block => {
      const regex = new RegExp(`\`\`\`(?:html)?\\s*(${block.content.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\s*\`\`\``, 'g');
      processed = processed.replace(regex, `\`\`\`html-card-${block.id}\n${block.content}\n\`\`\``);
    });

    setProcessedContent(processed);
  }, [props.content]);

  return (
    <>
      {/* 渲染 Markdown 内容 */}
      <Markdown
        remarkPlugins={[RemarkMath, remarkGfm, RemarkBreaks]}
        rehypePlugins={[
          RehypeKatex as any,
          [
            rehypeHighlight as any,
            {
              detect: false,
              ignoreMissing: true,
            },
          ],
        ]}
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            // 检查是否是 SVG 卡片代码块
            if (!inline && match && match[1].includes('svg') && className) {
              // 从类名中提取 ID
              const id = className.replace('hljs language-svg-card-', '');
              // 查找对应的 SVG 块
              const svgBlock = svgBlocks.find(block => block.id === id);
              if (svgBlock) {
                return <FileCard
                  content={svgBlock.content}
                  cardId={svgBlock.id}
                  contentType="svg"
                />;
              }
            }

            // 检查是否是 HTML 卡片代码块
            if (!inline && match && match[1].includes('html') && className) {
              // 从类名中提取 ID
              const id = className.replace('hljs language-html-card-', '');
              // 查找对应的 HTML 块
              const htmlBlock = htmlBlocks.find(block => block.id === id);
              if (htmlBlock) {
                return <FileCard
                  content={htmlBlock.content}
                  cardId={htmlBlock.id}
                  contentType="html"
                />;
              }
            }

            return !inline && match ? (
              <CodeBlock language={match[1]}>{children}</CodeBlock>
            ) : (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          a: (aProps: React.AnchorHTMLAttributes<HTMLAnchorElement> & { 'data-footnote-ref'?: string }) => {
            const isFootnote = aProps['data-footnote-ref'] !== undefined;
            if (isFootnote) {
              return <span style={{ backgroundColor: '#d0e1fd', fontFamily: '', fontSize: '9px', marginRight: '3px', borderRadius: '11px', padding: '1px 4px' }} {...aProps}>{aProps.children}</span>;
            }
            const href = aProps.href || "";
            if (/\.(aac|mp3|opus|wav)$/.test(href)) {
              return (
                <figure>
                  <audio controls src={href}></audio>
                </figure>
              );
            }
            if (/\.(3gp|3g2|webm|ogv|mpeg|mp4|avi)$/.test(href)) {
              return (
                <video controls width="99.9%">
                  <source src={href} />
                </video>
              );
            }
            const isInternal = /^\/(?!\/)|^\.\/|^#/.test(href);
            const target = isInternal ? "_self" : aProps.target ?? "_blank";
            return <a {...aProps} target={target} />;
          },
        }}
      >
        {processedContent}
      </Markdown>
    </>
  );
};

export default MarkdownRender;
