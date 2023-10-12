'use server';

import Question from '@/database/question.model';
import { connectToDataBase } from '../mongoose';
import { CreateQuestionParams } from './shared.types';
import Tag from '@/database/tag.model';
import { revalidatePath } from 'next/cache';
import console from 'console';

export async function createQuestion(params: CreateQuestionParams) {
  try {
    connectToDataBase();
    const { title, content, tags, author, path } = params;
    const question = await Question.create({
      title,
      content,
      author,
    });

    const tagDocuments = [];
    for (const tag of tags) {
      const existingTag = await Tag.findOneAndUpdate(
        { name: { $regex: new RegExp(`^${tag}$`, 'i') } },
        { $setOnInsert: { name: tag }, $push: { questions: question._id } },
        { upsert: true, new: true }
      );

      tagDocuments.push(existingTag._id);
    }

    await Question.findByIdAndUpdate(question._id, {
      $push: { tags: { $each: tagDocuments } },
    });

    console.log('Question created successfully');

    revalidatePath(path);

    return question;
  } catch (error) {
    console.log(error);
    throw error;
  }
}
