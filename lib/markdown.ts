import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const contentDirectory = path.join(process.cwd(), 'content');

export function getPostData(fileName: string) {
  const fullPath = path.join(contentDirectory, `${fileName}.md`);
  const fileContents = fs.readFileSync(fullPath, 'utf8');

  // Menggunakan gray-matter untuk parsing metadata
  const matterResult = matter(fileContents);

  return {
    fileName,
    content: matterResult.content,
    ...(matterResult.data as { title: string; category: string }),
  };
}

export function getAllPosts() {
    const fileNames = fs.readdirSync(contentDirectory);
    const posts = fileNames.map((fileName) => {
      return getPostData(fileName.replace(/\.md$/, ''));
    });
  
    return posts;
  }

  export function getPostsByCategory(category: string) {
    const allPosts = getAllPosts();
    return allPosts.filter((post) => post.category === category);
    }