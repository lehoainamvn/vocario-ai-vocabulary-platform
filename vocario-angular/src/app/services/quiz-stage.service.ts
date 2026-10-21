import { Injectable, signal, computed, inject } from '@angular/core';
import { ToastService } from './toast.service';
import { UserStudyService, ContextWord } from './user-study.service';

export interface QuizStage {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  badge: string;
  imageUrl: string;
  words: ContextWord[];
  isOfficial?: boolean;
  isPublished?: boolean;
  createdAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class QuizStageService {
  private toast = inject(ToastService);
  private studyService = inject(UserStudyService);

  private readonly STORAGE_STAGES_KEY = 'vocario_admin_quiz_stages';
  private readonly STORAGE_WEEKLY_KEY = 'vocario_admin_weekly_stage_id';

  // Đấu trường chính thức mặc định tuần này
  readonly defaultOfficialStage: QuizStage = {
    id: 'stage-admin-kitchen',
    title: 'Gian Bếp Đời Thực',
    subtitle: 'Bối cảnh thi đấu chính thức tuần này dành cho toàn thể học viên',
    category: 'Đời Sống Gia Đình',
    badge: 'Đấu trường tuần',
    imageUrl: '/kitchen_refrigerator.png',
    isOfficial: true,
    createdAt: 'Hệ thống chuẩn hóa',
    words: [
      {
        id: 'k-1',
        word: 'refrigerator',
        ipa: '/rɪˈfrɪdʒəreɪtər/',
        vietnamese: 'tủ lạnh',
        partOfSpeech: 'noun',
        level: 'A2',
        colorBg: 'bg-[#F7D147]',
        colorBorder: 'border-amber-400',
        colorText: 'text-amber-900',
        exampleEn: 'The refrigerator keeps food fresh and cold.',
        exampleVi: 'Tủ lạnh giữ thức ăn luôn tươi ngon và mát lạnh.',
        topPercent: 24,
        leftPercent: 6,
        widthPercent: 32,
        heightPercent: 68
      },
      {
        id: 'k-2',
        word: 'gas stove',
        ipa: '/ˈɡæs stəʊv/',
        vietnamese: 'bếp ga nấu ăn',
        partOfSpeech: 'noun',
        level: 'A2',
        colorBg: 'bg-[#F5C2C7]',
        colorBorder: 'border-rose-400',
        colorText: 'text-rose-900',
        exampleEn: 'Be careful when turning on the gas stove.',
        exampleVi: 'Hãy cẩn thận khi bật bếp ga nấu nướng.',
        topPercent: 58,
        leftPercent: 62,
        widthPercent: 28,
        heightPercent: 25
      },
      {
        id: 'k-3',
        word: 'water bottle',
        ipa: '/ˈwɔːtər ˈbɒtl/',
        vietnamese: 'chai nước uống',
        partOfSpeech: 'noun',
        level: 'A1',
        colorBg: 'bg-[#CFF4FC]',
        colorBorder: 'border-cyan-400',
        colorText: 'text-cyan-900',
        exampleEn: 'Always carry a water bottle to stay hydrated.',
        exampleVi: 'Luôn mang theo chai nước để uống đủ nước.',
        topPercent: 54,
        leftPercent: 44,
        widthPercent: 12,
        heightPercent: 28
      },
      {
        id: 'k-4',
        word: 'cardboard box',
        ipa: '/ˈkɑːdbɔːd bɒks/',
        vietnamese: 'thùng các-tông đựng đồ',
        partOfSpeech: 'noun',
        level: 'B1',
        colorBg: 'bg-[#D6D8F8]',
        colorBorder: 'border-indigo-400',
        colorText: 'text-indigo-900',
        exampleEn: 'Put the extra tools into the cardboard box.',
        exampleVi: 'Đặt các dụng cụ dư vào trong thùng các-tông.',
        topPercent: 62,
        leftPercent: 78,
        widthPercent: 20,
        heightPercent: 34
      },
      {
        id: 'k-5',
        word: 'picture frame',
        ipa: '/ˈpɪktʃər freɪm/',
        vietnamese: 'khung tranh ảnh treo tường',
        partOfSpeech: 'noun',
        level: 'A2',
        colorBg: 'bg-[#D1E7DD]',
        colorBorder: 'border-emerald-400',
        colorText: 'text-emerald-900',
        exampleEn: 'A lovely picture frame is hanging on the wall.',
        exampleVi: 'Một khung ảnh đáng yêu đang treo trên tường.',
        topPercent: 8,
        leftPercent: 52,
        widthPercent: 20,
        heightPercent: 25
      }
    ]
  };

  // Đấu trường hệ thống mẫu 2: Góc học tập & làm việc
  readonly defaultStudyStage: QuizStage = {
    id: 'stage-admin-study',
    title: 'Góc Học Tập & Công Việc',
    subtitle: 'Bối cảnh bàn làm việc sáng tạo với đồ dùng học thuật chuẩn CEFR',
    category: 'Học Tập & Công Việc',
    badge: 'Đấu trường hệ thống',
    imageUrl: '/study_desk.png',
    isOfficial: true,
    isPublished: true,
    createdAt: 'Hệ thống chuẩn hóa',
    words: [
      {
        id: 'sd-1',
        word: 'laptop',
        ipa: '/ˈlæptɒp/',
        vietnamese: 'máy tính xách tay',
        partOfSpeech: 'noun',
        level: 'A1',
        colorBg: 'bg-[#F7D147]',
        colorBorder: 'border-amber-400',
        colorText: 'text-amber-900',
        exampleEn: 'I use my laptop to work every day.',
        exampleVi: 'Tôi sử dụng máy tính xách tay để làm việc mỗi ngày.',
        topPercent: 32,
        leftPercent: 34,
        widthPercent: 28,
        heightPercent: 26
      },
      {
        id: 'sd-2',
        word: 'desk lamp',
        ipa: '/ˈdesk læmp/',
        vietnamese: 'đèn học để bàn',
        partOfSpeech: 'noun',
        level: 'A2',
        colorBg: 'bg-[#98D8AA]',
        colorBorder: 'border-emerald-400',
        colorText: 'text-emerald-950',
        exampleEn: 'Turn on the desk lamp when reading at night.',
        exampleVi: 'Hãy bật đèn học khi đọc sách vào ban đêm.',
        topPercent: 12,
        leftPercent: 12,
        widthPercent: 18,
        heightPercent: 34
      },
      {
        id: 'sd-3',
        word: 'chair',
        ipa: '/tʃeər/',
        vietnamese: 'ghế ngồi làm việc',
        partOfSpeech: 'noun',
        level: 'A1',
        colorBg: 'bg-[#F5C2C7]',
        colorBorder: 'border-rose-400',
        colorText: 'text-rose-900',
        exampleEn: 'This ergonomic chair supports my back.',
        exampleVi: 'Chiếc ghế công thái học này nâng đỡ lưng của tôi.',
        topPercent: 52,
        leftPercent: 38,
        widthPercent: 24,
        heightPercent: 44
      },
      {
        id: 'sd-4',
        word: 'notebook',
        ipa: '/ˈnəʊtbʊk/',
        vietnamese: 'sổ tay ghi chép',
        partOfSpeech: 'noun',
        level: 'A1',
        colorBg: 'bg-[#CFF4FC]',
        colorBorder: 'border-cyan-400',
        colorText: 'text-cyan-900',
        exampleEn: 'Write down key ideas in your notebook.',
        exampleVi: 'Hãy viết các ý chính vào sổ tay của bạn.',
        topPercent: 48,
        leftPercent: 66,
        widthPercent: 18,
        heightPercent: 20
      }
    ]
  };

  // Đấu trường hệ thống mẫu 3: Phòng khách ấm cúng
  readonly defaultLivingStage: QuizStage = {
    id: 'stage-admin-living',
    title: 'Phòng Khách Ấm Cúng',
    subtitle: 'Không gian sinh hoạt gia đình và tiếp đón bạn bè thân mật',
    category: 'Nội Thất & Tiện Nghi',
    badge: 'Đấu trường hệ thống',
    imageUrl: '/living_room.jpg',
    isOfficial: true,
    isPublished: true,
    createdAt: 'Hệ thống chuẩn hóa',
    words: [
      {
        id: 'lr-1',
        word: 'sofa',
        ipa: '/ˈsəʊfə/',
        vietnamese: 'ghế sô-pha',
        partOfSpeech: 'noun',
        level: 'A1',
        colorBg: 'bg-[#F7D147]',
        colorBorder: 'border-amber-400',
        colorText: 'text-amber-900',
        exampleEn: 'We sit on the comfortable sofa to watch movies.',
        exampleVi: 'Chúng tôi ngồi trên chiếc sô-pha êm ái để xem phim.',
        topPercent: 48,
        leftPercent: 22,
        widthPercent: 52,
        heightPercent: 38
      },
      {
        id: 'lr-2',
        word: 'coffee table',
        ipa: '/ˈkɒfi ˈteɪbl/',
        vietnamese: 'bàn trà phòng khách',
        partOfSpeech: 'noun',
        level: 'A2',
        colorBg: 'bg-[#98D8AA]',
        colorBorder: 'border-emerald-400',
        colorText: 'text-emerald-950',
        exampleEn: 'There is a cup of hot tea on the coffee table.',
        exampleVi: 'Có một tách trà nóng trên bàn trà.',
        topPercent: 66,
        leftPercent: 34,
        widthPercent: 32,
        heightPercent: 24
      },
      {
        id: 'lr-3',
        word: 'indoor plant',
        ipa: '/ˈɪndɔː plɑːnt/',
        vietnamese: 'chậu cây cảnh trong nhà',
        partOfSpeech: 'noun',
        level: 'A2',
        colorBg: 'bg-[#D1E7DD]',
        colorBorder: 'border-emerald-400',
        colorText: 'text-emerald-900',
        exampleEn: 'An indoor plant freshens up the living room.',
        exampleVi: 'Một chậu cây trong nhà làm tươi mát cả phòng khách.',
        topPercent: 36,
        leftPercent: 78,
        widthPercent: 16,
        heightPercent: 42
      }
    ]
  };

  // Danh sách các đấu trường do Admin tạo & quản lý
  adminStages = signal<QuizStage[]>(this.loadAdminStages());

  // ID của đấu trường tuần đang được kích hoạt phát sóng (Tiêu điểm bảng xếp hạng tuần)
  activeWeeklyStageId = signal<string>(
    localStorage.getItem(this.STORAGE_WEEKLY_KEY) || 'stage-admin-kitchen'
  );

  // Đấu trường tuần đang hoạt động (kết nối trực tiếp với học viên)
  activeWeeklyStage = computed<QuizStage>(() => {
    const weeklyId = this.activeWeeklyStageId();
    const found = this.adminStages().find(s => s.id === weeklyId);
    if (found) {
      return found;
    }
    // Nếu không tìm thấy trong adminStages, tìm trong user scenes
    const userScene = this.studyService.scenes().find(s => s.id === weeklyId);
    if (userScene && userScene.words && userScene.imageUrl) {
      return {
        id: userScene.id,
        title: userScene.title || 'Bối Cảnh Thi Đấu Tuần',
        subtitle: `Đấu trường tuần trích xuất từ ảnh thực tế • ${userScene.words.length} vật thể`,
        category: 'Đấu Trường Chính Thức',
        badge: 'Đấu trường tuần',
        imageUrl: userScene.imageUrl,
        words: userScene.words,
        isOfficial: true,
        isPublished: true
      };
    }
    return this.defaultOfficialStage;
  });

  // Danh sách các đấu trường hệ thống ĐÃ ĐƯỢC ĐĂNG / XUẤT BẢN CHO HỌC VIÊN
  publishedAdminStages = computed<QuizStage[]>(() => {
    return this.adminStages().filter(s => s.isPublished !== false);
  });

  // Danh sách đấu trường từ ảnh người dùng tải lên:
  // CHỈ hiển thị các ảnh có chứa từ vựng ĐÃ ĐƯỢC LƯU vào Sổ tay (user_word_progress)
  // và CHỈ đưa các từ đã lưu đó vào danh sách thi đấu phản xạ!
  userStages = computed<QuizStage[]>(() => {
    const scenes = this.studyService.scenes();
    const savedWords = this.studyService.savedWords();

    // Map tra cứu từ vựng viết thường đã lưu vào sổ tay
    const savedMap = new Map<string, typeof savedWords[0]>();
    for (const w of savedWords) {
      if (w.word) {
        savedMap.set(w.word.trim().toLowerCase(), w);
      }
    }

    const list: QuizStage[] = [];
    for (const s of scenes) {
      if (!s.imageUrl || !s.words || s.words.length === 0) continue;

      // Lọc các từ trong bối cảnh này mà người dùng ĐÃ LƯU vào sổ từ vựng
      const savedInScene = s.words
        .filter(w => w.word && savedMap.has(w.word.trim().toLowerCase()))
        .map(w => {
          const savedItem = savedMap.get(w.word.trim().toLowerCase());
          return {
            ...w,
            progressId: savedItem?.id
          };
        });

      // Chỉ tạo đấu trường cá nhân nếu người học đã lưu ít nhất 1 từ từ ảnh này
      if (savedInScene.length >= 1) {
        list.push({
          id: s.id,
          title: s.title || 'Bối Cảnh Từ Ảnh Của Bạn',
          subtitle: `${savedInScene.length}/${s.words.length} từ đã lưu trong sổ • Ảnh chụp lúc ${s.createdAt || 'gần đây'}`,
          category: 'Ảnh Của Bạn',
          badge: 'Ảnh của bạn',
          imageUrl: s.imageUrl,
          words: savedInScene, // CHỈ thi đấu các từ người dùng đã lưu vào sổ!
          isOfficial: false,
          isPublished: true,
          createdAt: s.createdAt
        });
      }
    }
    return list;
  });

  // Toàn bộ các đấu trường học viên có thể tham gia:
  // Đấu trường tuần (đưa lên đầu) + các đấu trường hệ thống đã đăng khác + ảnh của người dùng
  allPlayableStages = computed<QuizStage[]>(() => {
    const weekly = this.activeWeeklyStage();
    const otherAdminStages = this.publishedAdminStages().filter(s => s.id !== weekly.id);
    const userList = this.userStages().filter(s => s.id !== weekly.id);
    return [weekly, ...otherAdminStages, ...userList];
  });

  private loadAdminStages(): QuizStage[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_STAGES_KEY);
      if (stored) {
        const parsed: QuizStage[] = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(s => ({
            ...s,
            isPublished: s.isPublished !== false
          }));
        }
      }
    } catch (e) {
      console.warn('Could not parse stored admin stages:', e);
    }
    return [
      { ...this.defaultOfficialStage, isPublished: true },
      this.defaultStudyStage,
      this.defaultLivingStage
    ];
  }

  private persistAdminStages(): void {
    try {
      localStorage.setItem(this.STORAGE_STAGES_KEY, JSON.stringify(this.adminStages()));
    } catch (e) {
      console.error('Failed to persist admin stages:', e);
    }
  }

  // Admin: Thêm đấu trường mới (tự động xuất bản cho học viên)
  createStage(data: {
    title: string;
    subtitle: string;
    category: string;
    imageUrl: string;
    words: ContextWord[];
  }): QuizStage {
    const newStage: QuizStage = {
      id: 'stage-' + Date.now().toString(36),
      title: data.title.trim(),
      subtitle: data.subtitle.trim() || 'Đấu trường thị giác chuẩn hóa',
      category: data.category.trim() || 'Đời Sống & Đồ Vật',
      badge: 'Đấu trường hệ thống',
      imageUrl: data.imageUrl.trim() || '/kitchen_refrigerator.png',
      words: data.words || [],
      isOfficial: true,
      isPublished: true,
      createdAt: new Date().toLocaleDateString('vi-VN')
    };

    const updated = [newStage, ...this.adminStages()];
    this.adminStages.set(updated);
    this.persistAdminStages();
    this.toast.success(`Đã tạo và đăng thành công đấu trường "${newStage.title}"!`);
    return newStage;
  }

  // Admin: Cập nhật thông tin đấu trường
  updateStage(id: string, data: Partial<QuizStage>): boolean {
    const list = this.adminStages();
    const idx = list.findIndex(s => s.id === id);
    if (idx === -1) {
      this.toast.error('Không tìm thấy đấu trường cần chỉnh sửa.');
      return false;
    }

    const updatedList = [...list];
    updatedList[idx] = {
      ...updatedList[idx],
      ...data
    };

    this.adminStages.set(updatedList);
    this.persistAdminStages();
    this.toast.success(`Đã cập nhật đấu trường "${updatedList[idx].title}"!`);
    return true;
  }

  // Admin: Bật / Tắt trạng thái Đăng (Xuất bản) của một đấu trường
  togglePublishStage(id: string): boolean {
    const list = this.adminStages();
    const idx = list.findIndex(s => s.id === id);
    if (idx === -1) return false;

    const current = list[idx].isPublished !== false;
    const nextState = !current;

    // Không cho phép ẩn đấu trường tuần đang phát sóng nếu chỉ có 1 đấu trường đang đăng
    if (!nextState && this.activeWeeklyStageId() === id && this.publishedAdminStages().length <= 1) {
      this.toast.error('Hệ thống cần duy trì ít nhất 1 đấu trường đang phát sóng cho học viên!');
      return false;
    }

    const updatedList = [...list];
    updatedList[idx] = {
      ...updatedList[idx],
      isPublished: nextState
    };

    // Nếu ẩn đấu trường đang là tuần, tự động chuyển tuần sang đấu trường khác đang đăng
    if (!nextState && this.activeWeeklyStageId() === id) {
      const remainingPublished = updatedList.filter(s => s.isPublished !== false && s.id !== id);
      if (remainingPublished.length > 0) {
        this.activeWeeklyStageId.set(remainingPublished[0].id);
        localStorage.setItem(this.STORAGE_WEEKLY_KEY, remainingPublished[0].id);
      }
    }

    this.adminStages.set(updatedList);
    this.persistAdminStages();

    if (nextState) {
      this.toast.success(`Đã đăng phát sóng đấu trường "${list[idx].title}" cho học viên!`);
    } else {
      this.toast.info(`Đã tạm ẩn đấu trường "${list[idx].title}" về trạng thái bản nháp.`);
    }
    return true;
  }

  // Admin: Đăng toàn bộ tất cả đấu trường cho học viên
  publishAllStages(): void {
    const updated = this.adminStages().map(s => ({
      ...s,
      isPublished: true
    }));
    this.adminStages.set(updated);
    this.persistAdminStages();
    this.toast.success(`Đã đăng toàn bộ ${updated.length} đấu trường cho học viên thi đấu!`);
  }

  // Admin: Xóa đấu trường
  deleteStage(id: string): boolean {
    const list = this.adminStages();
    const target = list.find(s => s.id === id);
    if (!target) return false;

    if (list.length <= 1) {
      this.toast.error('Hệ thống cần duy trì ít nhất 1 đấu trường để vận hành.');
      return false;
    }

    const filtered = list.filter(s => s.id !== id);
    this.adminStages.set(filtered);
    this.persistAdminStages();

    // Nếu vừa xóa trúng đấu trường tuần hiện tại, fallback về đấu trường đầu tiên
    if (this.activeWeeklyStageId() === id) {
      this.setWeeklyStage(filtered[0].id);
    }

    this.toast.success(`Đã xóa đấu trường "${target.title}".`);
    return true;
  }

  // Admin: Đăng / Kích hoạt làm Đấu trường tuần chính thức cho toàn hệ thống
  setWeeklyStage(id: string): void {
    const list = this.adminStages();
    const idx = list.findIndex(s => s.id === id);
    if (idx !== -1 && list[idx].isPublished === false) {
      list[idx] = { ...list[idx], isPublished: true };
      this.adminStages.set([...list]);
      this.persistAdminStages();
    }

    this.activeWeeklyStageId.set(id);
    localStorage.setItem(this.STORAGE_WEEKLY_KEY, id);
    
    // Tìm tên để thông báo
    const stage = this.adminStages().find(s => s.id === id) || 
                  this.userStages().find(s => s.id === id);
    const title = stage?.title || 'Đấu trường';
    this.toast.success(`Đã chọn "${title}" làm Đấu Trường Tuần chính thức!`);
  }

  // Đặt lại dữ liệu gốc mặc định (3 đấu trường hệ thống chuẩn hóa)
  resetToDefault(): void {
    const defaults = [
      { ...this.defaultOfficialStage, isPublished: true },
      this.defaultStudyStage,
      this.defaultLivingStage
    ];
    this.adminStages.set(defaults);
    this.setWeeklyStage(this.defaultOfficialStage.id);
    this.persistAdminStages();
    this.toast.success('Đã đặt lại danh sách 3 đấu trường hệ thống chuẩn hóa.');
  }
}
