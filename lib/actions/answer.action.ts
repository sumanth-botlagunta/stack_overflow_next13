'use server';

import Answer from '@/database/answer.model';
import { connectToDataBase } from '../mongoose';
import { CreateAnswerParams, GetAnswersParams } from './shared.types';
import Question from '@/database/question.model';
import { revalidatePath } from 'next/cache';
import User from '@/database/user.model';

export async function createAnswer(params: CreateAnswerParams) {
  try {
    connectToDataBase();
    const { author, content, path, question } = params;
    const answer = await Answer.create({ author, content, question });
    await Question.findByIdAndUpdate(question, {
      $push: { answers: answer._id },
    });
    revalidatePath(path);
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function getAnswers(params: GetAnswersParams) {
  try {
    connectToDataBase();
    const { questionId } = params;

    const answers = await Answer.find({ question: questionId })
      .populate({
        path: 'author',
        model: User,
        select: '_id name picture clerkId',
      })
      .sort({ createdAt: -1 });
    return { answers };
  } catch (error) {
    console.log(error);
    throw error;
  }
}
