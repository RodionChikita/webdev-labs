"""Модуль для работы с курсами."""

from flask import Blueprint, render_template, request, flash, redirect, url_for
from flask_login import login_required, current_user
from sqlalchemy.exc import IntegrityError
from models import db, Course, Category, User, Review
from tools import CoursesFilter, ImageSaver

bp = Blueprint('courses', __name__, url_prefix='/courses')

COURSE_PARAMS = [
    'author_id', 'name', 'category_id', 'short_desc', 'full_desc'
]

def params():
    """Извлекает параметры курса из формы."""
    return { p: request.form.get(p) or None for p in COURSE_PARAMS }

def search_params():
    """Извлекает параметры поиска из формы."""
    name = request.args.get('name')
    category_ids = [request.args.get('category_ids')] if request.args.get('category_ids') else []
    return dict(name=name, category_ids=category_ids)

@bp.route('/')
def index():
    """Отображает список курсов с возможностью поиска."""
    courses = CoursesFilter(**search_params()).perform()
    pagination = db.paginate(courses)
    courses = pagination.items
    categories = db.session.execute(db.select(Category)).scalars()
    return render_template('courses/index.html',
                           courses=courses,
                           categories=categories,
                           pagination=pagination,
                           search_params=search_params())

@bp.route('/new')
@login_required
def new():
    """Отображает форму создания нового курса."""
    course = Course()
    categories = db.session.execute(db.select(Category)).scalars()
    users = db.session.execute(db.select(User)).scalars()
    return render_template('courses/new.html',
                           categories=categories,
                           users=users,
                           course=course)

@bp.route('/create', methods=['POST'])
@login_required
def create():
    """Создает новый курс."""
    f = request.files.get('background_img')
    img = None
    course = Course()
    try:
        if f and f.filename:
            img = ImageSaver(f).save()

        image_id = img.id if img else None
        course = Course(**params(), background_image_id=image_id)
        db.session.add(course)
        db.session.commit()
    except IntegrityError as err:
        flash(f'Возникла ошибка при записи данных в БД. Проверьте корректность введённых данных. ({err})', 'danger')
        db.session.rollback()
        categories = db.session.execute(db.select(Category)).scalars()
        users = db.session.execute(db.select(User)).scalars()
        return render_template('courses/new.html',
                            categories=categories,
                            users=users,
                            course=course)

    flash(f'Курс {course.name} был успешно добавлен!', 'success')
    return redirect(url_for('courses.index'))

@bp.route('/<int:course_id>')
def show(course_id):
    """Отображает страницу курса с отзывами."""
    course = db.get_or_404(Course, course_id)
    
    recent_reviews = db.session.execute(
        db.select(Review).filter(Review.course_id == course_id)
        .order_by(Review.created_at.desc())
        .limit(5)
    ).scalars().all()
    
    user_review = None
    if current_user.is_authenticated:
        user_review = db.session.execute(
            db.select(Review).filter(
                Review.course_id == course_id,
                Review.user_id == current_user.id
            )
        ).scalar()
    
    return render_template('courses/show.html', 
                         course=course, 
                         recent_reviews=recent_reviews,
                         user_review=user_review)

@bp.route('/<int:course_id>/reviews')
def reviews(course_id):
    """Отображает все отзывы к курсу с пагинацией и сортировкой."""
    course = db.get_or_404(Course, course_id)
    
    sort_by = request.args.get('sort_by', 'newest')
    
    query = db.select(Review).filter(Review.course_id == course_id)
    
    if sort_by == 'positive':
        query = query.order_by(Review.rating.desc(), Review.created_at.desc())
    elif sort_by == 'negative':
        query = query.order_by(Review.rating.asc(), Review.created_at.desc())
    else:
        query = query.order_by(Review.created_at.desc())
    
    pagination = db.paginate(query, per_page=10)
    reviews = pagination.items
    
    user_review = None
    if current_user.is_authenticated:
        user_review = db.session.execute(
            db.select(Review).filter(
                Review.course_id == course_id,
                Review.user_id == current_user.id
            )
        ).scalar()
    
    return render_template('courses/reviews.html',
                         course=course,
                         reviews=reviews,
                         pagination=pagination,
                         sort_by=sort_by,
                         user_review=user_review)

@bp.route('/<int:course_id>/reviews/create', methods=['POST'])
@login_required
def create_review(course_id):
    """Создает новый отзыв к курсу."""
    course = db.get_or_404(Course, course_id)
    
    existing_review = db.session.execute(
        db.select(Review).filter(
            Review.course_id == course_id,
            Review.user_id == current_user.id
        )
    ).scalar()
    
    if existing_review:
        flash('Вы уже оставили отзыв к этому курсу', 'warning')
        return redirect(url_for('courses.show', course_id=course_id))
    
    rating = int(request.form.get('rating', 5))
    text = request.form.get('text', '')
    
    review = Review(
        rating=rating,
        text=text,
        course_id=course_id,
        user_id=current_user.id
    )
    
    db.session.add(review)
    
    course.rating_sum += rating
    course.rating_num += 1
    
    db.session.commit()
    
    flash('Отзыв успешно добавлен!', 'success')
    return redirect(url_for('courses.show', course_id=course_id))
