import React, { useState } from 'react';
import { Pencil, ChevronDown, ChevronRight } from 'lucide-react';
import {
  tierForScore,
  tierLabel,
  tierTextClass,
  tierBarClass,
  tierBgClass,
} from '../../utils/skillTiers';
import SkillVideoPanel from './SkillVideoPanel';

export interface SkillMasterySummary {
  name: string;
  score: number;
  // shown under the skill name when the list spans multiple courses
  courseName?: string;
  // needed to look up recommended videos for this skill; omit to disable the video panel
  courseId?: string;
}

interface SkillMasteryListProps {
  skills: SkillMasterySummary[];
}

const SkillMasteryList: React.FC<SkillMasteryListProps> = ({ skills }) => {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  if (skills.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-gray-500">
        No quiz attempts yet — your top skills will show up here once you've taken a Canvas quiz.
      </p>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {skills.map((skill, index) => {
        const tier = tierForScore(skill.score);
        const rowKey = `${skill.courseName ?? ''}-${skill.name}-${index}`;
        const isExpanded = expandedKey === rowKey;
        const canShowVideos = Boolean(skill.courseId);

        return (
          <div key={rowKey}>
            <div
              className={`flex items-center gap-4 py-3.5 ${canShowVideos ? 'cursor-pointer' : ''}`}
              onClick={() => canShowVideos && setExpandedKey(isExpanded ? null : rowKey)}
            >
              {canShowVideos && (
                <div className="flex h-9 w-4 flex-shrink-0 items-center justify-center text-gray-400">
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </div>
              )}
              <div
                className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${tierBgClass[tier]} ${tierTextClass[tier]}`}
              >
                <Pencil className="h-4 w-4" />
              </div>
              <div className="flex min-w-32 flex-1 flex-col gap-1.5">
                <div className="text-sm font-semibold text-gray-900">{skill.name}</div>
                {skill.courseName && <div className="text-xs text-gray-500">{skill.courseName}</div>}
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={`h-full rounded-full ${tierBarClass[tier]}`}
                    style={{ width: `${skill.score}%` }}
                  />
                </div>
              </div>
              <div className="w-12 flex-shrink-0 text-right text-[15px] font-bold text-gray-900">
                {skill.score}%
              </div>
              <div className="hidden w-28 flex-shrink-0 text-right text-xs text-gray-500 sm:block">
                {tierLabel[tier]}
              </div>
            </div>
            {canShowVideos && isExpanded && (
              <div className="pb-2 pl-[52px]">
                <SkillVideoPanel courseId={skill.courseId!} skillName={skill.name} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default SkillMasteryList;
