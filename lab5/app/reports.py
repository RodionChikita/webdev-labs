from flask import Blueprint, render_template, request, make_response, flash, redirect, url_for, current_app
from flask_login import login_required, current_user
from datetime import datetime
import csv
import io
from models import db, User, VisitLog

reports_bp = Blueprint('reports', __name__, url_prefix='/reports')

@reports_bp.route('/visits')
@login_required
def visit_logs():
    page = request.args.get('page', 1, type=int)
    per_page = 10
    
    if current_user.can_view_all_logs():
        logs = VisitLog.query.order_by(VisitLog.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
    else:
        logs = VisitLog.query.filter_by(user_id=current_user.id).order_by(VisitLog.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
    
    return render_template('reports/visit_logs.html', logs=logs)

@reports_bp.route('/pages')
@login_required
def pages_report():
    if not current_user.can_view_all_logs():
        flash('У вас недостаточно прав для доступа к данной странице.', 'error')
        return redirect(url_for('index'))
    
    page_stats = db.session.query(
        VisitLog.path,
        db.func.count(VisitLog.id).label('count')
    ).group_by(VisitLog.path).order_by(db.func.count(VisitLog.id).desc()).all()
    
    return render_template('reports/pages_report.html', page_stats=page_stats)

@reports_bp.route('/pages/export')
@login_required
def export_pages():
    if not current_user.can_view_all_logs():
        flash('У вас недостаточно прав для доступа к данной странице.', 'error')
        return redirect(url_for('index'))
    
    page_stats = db.session.query(
        VisitLog.path,
        db.func.count(VisitLog.id).label('count')
    ).group_by(VisitLog.path).order_by(db.func.count(VisitLog.id).desc()).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['№', 'Страница', 'Количество посещений'])
    
    for i, (path, count) in enumerate(page_stats, 1):
        writer.writerow([i, path, count])
    
    output.seek(0)
    response = make_response(output.getvalue())
    response.headers['Content-Type'] = 'text/csv; charset=utf-8-sig'
    response.headers['Content-Disposition'] = 'attachment; filename=pages_report.csv'
    
    return response

@reports_bp.route('/users')
@login_required
def users_report():
    if not current_user.can_view_all_logs():
        flash('У вас недостаточно прав для доступа к данной странице.', 'error')
        return redirect(url_for('index'))
    
    user_stats = db.session.query(
        User.id,
        User.last_name,
        User.first_name,
        User.middle_name,
        db.func.count(VisitLog.id).label('count')
    ).outerjoin(VisitLog).group_by(User.id).order_by(db.func.count(VisitLog.id).desc()).all()
    
    unauth_count = db.session.query(db.func.count(VisitLog.id)).filter(VisitLog.user_id.is_(None)).scalar()
    
    return render_template('reports/users_report.html', user_stats=user_stats, unauth_count=unauth_count)

@reports_bp.route('/users/export')
@login_required
def export_users():
    if not current_user.can_view_all_logs():
        flash('У вас недостаточно прав для доступа к данной странице.', 'error')
        return redirect(url_for('index'))
    
    user_stats = db.session.query(
        User.id,
        User.last_name,
        User.first_name,
        User.middle_name,
        db.func.count(VisitLog.id).label('count')
    ).outerjoin(VisitLog).group_by(User.id).order_by(db.func.count(VisitLog.id).desc()).all()
    
    unauth_count = db.session.query(db.func.count(VisitLog.id)).filter(VisitLog.user_id.is_(None)).scalar()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['№', 'Пользователь', 'Количество посещений'])
    
    row_num = 1
    for user_id, last_name, first_name, middle_name, count in user_stats:
        full_name = ' '.join(filter(None, [last_name, first_name, middle_name]))
        writer.writerow([row_num, full_name, count])
        row_num += 1
    
    if unauth_count > 0:
        writer.writerow([row_num, 'Неаутентифицированный пользователь', unauth_count])
    
    output.seek(0)
    response = make_response(output.getvalue())
    response.headers['Content-Type'] = 'text/csv; charset=utf-8-sig'
    response.headers['Content-Disposition'] = 'attachment; filename=users_report.csv'
    
    return response 