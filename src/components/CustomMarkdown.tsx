import React from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

interface CustomMarkdownProps {
  content: string;
}

const CustomMarkdown: React.FC<CustomMarkdownProps> = ({ content }) => {
  return (
    <Markdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw]}
      components={{
        a: ({ node, ...props }) => (
          <a {...props} target="_blank" rel="noopener noreferrer" />
        ),
        img: ({ node, ...props }) => (
          <div className="flex justify-center">
            <img {...props} className="w-2/3 h-auto object-cover rounded-lg" />
          </div>
        ),
        h1: ({ node, ...props }) => (
          <h1
            {...props}
            className="text-3xl font-bold text-black dark:text-white mb-4 mt-8"
          />
        ),
        h2: ({ node, ...props }) => (
          <h2
            {...props}
            className="text-2xl font-bold text-black dark:text-white mb-4 mt-8"
          />
        ),
        h3: ({ node, ...props }) => (
          <h3
            {...props}
            className="text-xl font-bold text-black dark:text-white mb-4 mt-8"
          />
        ),
        ul: ({ node, ...props }) => (
          <ul
            {...props}
            className="list-disc list-inside text-black dark:text-white"
          />
        ),
        ol: ({ node, ...props }) => (
          <ol
            {...props}
            className="list-decimal list-inside text-black dark:text-white"
          />
        ),
        li: ({ node, ...props }) => (
          <li {...props} className="mb-2 text-black dark:text-white" />
        ),
        p: ({ node, ...props }) => (
          <p
            {...props}
            className="text-black dark:text-gray-300 whitespace-pre-line text-justify"
          />
        ),
        table: ({ node, ...props }) => (
          <table
            {...props}
            className="table-auto w-full text-black dark:text-white"
          />
        ),
        code: ({ node, ...props }) => (
          <code
            {...props}
            className="bg-gray-800 dark:bg-gray-900 text-white p-1 rounded-lg text-sm text-wrap"
          />
        ),
      }}
    >
      {content}
    </Markdown>
  );
};

export default CustomMarkdown;
