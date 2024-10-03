import { useState, useEffect, useMemo } from 'react';

interface Slot {
  startDt: string;
  endDt: string;
  __typename: string;
}

interface SlotsData {
  plannedDispatches: Slot[];
}

interface Time {
  hours: number;
  minutes: number;
}

export default function useSlotChecker({ slotsData }: { slotsData: SlotsData }) {
  const [message, setMessage] = useState<string>('');

  // Helper function to convert string date to time (24-hour format)
  const extractTime = (dateString: string): Time => {
    const date = new Date(dateString);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    return { hours, minutes };
  };

  // Helper function to check if a given time is within the range
  const isTimeWithin = (time: Time, start: Time, end: Time): boolean => {
    const timeInMinutes = time.hours * 60 + time.minutes;
    const startInMinutes = start.hours * 60 + start.minutes;
    const endInMinutes = end.hours * 60 + end.minutes;

    if (startInMinutes < endInMinutes) {
      return timeInMinutes >= startInMinutes && timeInMinutes <= endInMinutes;
    } else {
      // Handle case when the period wraps around midnight (e.g., 23:30 - 05:30)
      return timeInMinutes >= startInMinutes || timeInMinutes <= endInMinutes;
    }
  };

  const checkSlots = () => {
    const nightStart: Time = { hours: 23, minutes: 30 }; // 23:30
    const nightEnd: Time = { hours: 5, minutes: 30 }; // 05:30

    const outsideSlots: string[] = [];

    slotsData?.plannedDispatches?.forEach((item: Slot) => {
      const startTime = extractTime(item.startDt);
      const endTime = extractTime(item.endDt);

      const isStartWithin = isTimeWithin(startTime, nightStart, nightEnd);
      const isEndWithin = isTimeWithin(endTime, nightStart, nightEnd);

      if (!isStartWithin || !isEndWithin) {
        const formattedStart = `${startTime.hours}:${startTime.minutes
          .toString()
          .padStart(2, '0')}`;
        const formattedEnd = `${endTime.hours}:${endTime.minutes
          .toString()
          .padStart(2, '0')}`;
        outsideSlots.push(
          `Slot from ${formattedStart} to ${formattedEnd} is outside the cheap rate.`,
        );
      }
    });

    if (outsideSlots.length > 0) {
      setMessage(
        `Some slots are outside the period: \n${outsideSlots.join('\n')}`,
      );
    } else {
      setMessage('All slots are within the cheap night rate period.');
    }
  };

  useEffect(() => {
    checkSlots();
  }, [slotsData]);

  return useMemo(
    () => ({
      message,
    }),
    [
      message,
    ],
  );}
