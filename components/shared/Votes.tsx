'use client';
import { useState } from 'react';
import { downvoteAnswer, upvoteAnswer } from '@/lib/actions/answer.action';
import {
  downvoteQuestion,
  upvoteQuestion,
} from '@/lib/actions/question.action';
import { formatAndDivideNumber } from '@/lib/utils';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { toggleSaveQuestion } from '@/lib/actions/user.action';

type Props = {
  type: 'Question' | 'Answer';
  itemId: string;
  userId: string;
  upvotes: number;
  hasupVoted: boolean;
  downvotes: number;
  hasdownVoted: boolean;
  hasSaved?: boolean;
};

const Votes = ({
  type,
  itemId,
  userId,
  upvotes,
  hasupVoted,
  downvotes,
  hasdownVoted,
  hasSaved,
}: Props) => {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);

  const handleVote = async (voteType: 'upvote' | 'downvote') => {
    if (!userId || loading) return;
    setLoading(true);
    try {
      if (voteType === 'upvote') {
        if (type === 'Question') {
          await upvoteQuestion({
            userId: JSON.parse(userId),
            questionId: JSON.parse(itemId),
            path: pathname,
            hasupVoted,
            hasdownVoted,
          });
        }

        if (type === 'Answer') {
          await upvoteAnswer({
            userId: JSON.parse(userId),
            answerId: JSON.parse(itemId),
            path: pathname,
            hasupVoted,
            hasdownVoted,
          });
        }
      }

      if (voteType === 'downvote') {
        if (type === 'Question') {
          await downvoteQuestion({
            userId: JSON.parse(userId),
            questionId: JSON.parse(itemId),
            path: pathname,
            hasupVoted,
            hasdownVoted,
          });
        }

        if (type === 'Answer') {
          await downvoteAnswer({
            userId: JSON.parse(userId),
            answerId: JSON.parse(itemId),
            path: pathname,
            hasupVoted,
            hasdownVoted,
          });
        }
      }
    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      setLoading(false);
    }
    // TODO: toast notification
  };
  const handleSave = async () => {
    await toggleSaveQuestion({
      userId: JSON.parse(userId),
      questionId: JSON.parse(itemId),
      path: pathname,
    });
  };
  return (
    <div className="flex gap-5">
      <div className="flex-center gap-2.5">
        <div className="flex-center gap-1.5">
          <Image
            src={
              hasupVoted
                ? '/assets/icons/upvoted.svg'
                : '/assets/icons/upvote.svg'
            }
            width={18}
            height={18}
            alt="upvote"
            className={`cursor-pointer ${
              loading ? 'pointer-events-none opacity-50' : ''
            }`}
            onClick={() => handleVote('upvote')}
          />

          <div className="flex-center background-light700_dark400 min-w-[18px] rounded-sm p-1">
            <p className="subtle-medium text-dark400_light900">
              {formatAndDivideNumber(upvotes)}
            </p>
          </div>
        </div>

        <div className="flex-center gap-1.5">
          <Image
            src={
              hasdownVoted
                ? '/assets/icons/downvoted.svg'
                : '/assets/icons/downvote.svg'
            }
            width={18}
            height={18}
            alt="downvote"
            className={`cursor-pointer ${
              loading ? 'pointer-events-none opacity-50' : ''
            }`}
            onClick={() => handleVote('downvote')}
          />

          <div className="flex-center background-light700_dark400 min-w-[18px] rounded-sm p-1">
            <p className="subtle-medium text-dark400_light900">
              {formatAndDivideNumber(downvotes)}
            </p>
          </div>
        </div>
      </div>

      {type === 'Question' && (
        <Image
          src={
            hasSaved
              ? '/assets/icons/star-filled.svg'
              : '/assets/icons/star-red.svg'
          }
          width={18}
          height={18}
          alt="star"
          className="cursor-pointer"
          onClick={handleSave}
        />
      )}
    </div>
  );
};

export default Votes;
